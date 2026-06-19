import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AccountEntryType, FamilyRole, Prisma } from "@prisma/client";
import { createHash } from "crypto";

import { AccountbookService } from "../accountbook/accountbook.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { HouseholdItemsService } from "../household-items/household-items.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateItemPurchaseDto } from "./dto/create-item-purchase.dto";

const purchaseInclude = {
  householdItem: true,
  productLink: true,
  purchasedByMember: true,
  itemAccountLink: {
    include: {
      accountEntry: {
        include: {
          accountCategory: true,
        },
      },
    },
  },
} satisfies Prisma.ItemPurchaseLogInclude;

type PurchaseWithRelations = Prisma.ItemPurchaseLogGetPayload<{ include: typeof purchaseInclude }>;

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HouseholdItemsService) private readonly householdItemsService: HouseholdItemsService,
    @Inject(AccountbookService) private readonly accountbookService: AccountbookService,
  ) {}

  async createPurchase(user: CurrentUserPayload, itemId: string, dto: CreateItemPurchaseDto) {
    const requestPayloadHash = this.createRequestPayloadHash(itemId, dto);
    const existing = await this.prisma.itemPurchaseLog.findUnique({
      where: {
        requestId: dto.requestId,
      },
      include: purchaseInclude,
    });

    if (existing) {
      await this.householdItemsService.ensureFamilyMember(user.userId, existing.householdItem.familyId);
      this.assertSameIdempotencyPayload(existing, itemId, dto, requestPayloadHash);

      return {
        purchase: this.serializePurchase(existing),
        idempotent: true,
      };
    }

    const item = await this.findAccessibleItemWithRelations(user.userId, itemId);
    const membership = await this.householdItemsService.ensureFamilyMember(user.userId, item.familyId);
    const totalAmount = new Prisma.Decimal(dto.totalAmount);
    const unitPrice = dto.unitPrice === undefined ? null : new Prisma.Decimal(dto.unitPrice);
    const quantity = dto.quantity === undefined ? null : new Prisma.Decimal(dto.quantity);
    const purchasedAt = dto.purchasedAt ? new Date(dto.purchasedAt) : new Date();

    this.assertAmountMatches(quantity, unitPrice, totalAmount);
    this.assertRuleOverrideAllowed(item.purchaseRule, totalAmount, dto.confirmRuleOverride ?? false, membership.role);

    if (dto.productLinkId) {
      const productLinkBelongsToItem = item.productLinks.some((link) => link.id === dto.productLinkId && !link.deletedAt);

      if (!productLinkBelongsToItem) {
        throw new BadRequestException("상품 URL 정보를 다시 확인해 주세요.");
      }
    }

    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
        const category = await this.accountbookService.getDefaultCategory(item.familyId, "HOUSEHOLD_SUPPLIES", tx);
        const nextEstimatedRunOutAt = item.cycleDays
          ? new Date(purchasedAt.getTime() + item.cycleDays * 24 * 60 * 60 * 1000)
          : null;

        const createdPurchase = await tx.itemPurchaseLog.create({
          data: {
            requestId: dto.requestId,
            requestPayloadHash,
            householdItemId: item.id,
            productLinkId: dto.productLinkId ?? null,
            purchasedByMemberId: membership.id,
            quantity,
            unitPrice,
            amount: totalAmount,
            currency: this.normalizeCurrency(dto.currency),
            purchasedAt,
            stockAfterPurchase: dto.stockAfterPurchase ?? null,
            note: this.trimOptional(dto.note),
          },
        });

        const accountEntry = await tx.accountEntry.create({
          data: {
            familyId: item.familyId,
            accountCategoryId: category.id,
            entryType: AccountEntryType.EXPENSE,
            amount: totalAmount,
            currency: this.normalizeCurrency(dto.currency),
            spentAt: purchasedAt,
            title: `${item.name} 구매`,
            memo: this.trimOptional(dto.note),
            createdByMemberId: membership.id,
          },
        });

        await tx.itemAccountLink.create({
          data: {
            itemPurchaseLogId: createdPurchase.id,
            accountEntryId: accountEntry.id,
          },
        });

        await tx.householdItem.update({
          where: {
            id: item.id,
          },
          data: {
            lastPurchasedAt: purchasedAt,
            nextEstimatedRunOutAt,
          },
        });

        return tx.itemPurchaseLog.findUniqueOrThrow({
          where: {
            id: createdPurchase.id,
          },
          include: purchaseInclude,
        });
      });

      return {
        purchase: this.serializePurchase(purchase),
        idempotent: false,
      };
    } catch (error) {
      if (this.isUniqueRequestIdError(error)) {
        const retried = await this.prisma.itemPurchaseLog.findUnique({
          where: {
            requestId: dto.requestId,
          },
          include: purchaseInclude,
        });

        if (retried) {
          await this.householdItemsService.ensureFamilyMember(user.userId, retried.householdItem.familyId);
          this.assertSameIdempotencyPayload(retried, itemId, dto, requestPayloadHash);

          return {
            purchase: this.serializePurchase(retried),
            idempotent: true,
          };
        }
      }

      throw error;
    }
  }

  async listPurchases(user: CurrentUserPayload, itemId: string) {
    const item = await this.householdItemsService.findAccessibleItem(user.userId, itemId);

    const purchases = await this.prisma.itemPurchaseLog.findMany({
      where: {
        householdItemId: item.id,
        deletedAt: null,
      },
      include: purchaseInclude,
      orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      purchases: purchases.map((purchase) => this.serializePurchase(purchase)),
    };
  }

  async getPurchase(user: CurrentUserPayload, purchaseId: string) {
    const purchase = await this.prisma.itemPurchaseLog.findFirst({
      where: {
        id: purchaseId,
        deletedAt: null,
      },
      include: purchaseInclude,
    });

    if (!purchase) {
      throw new NotFoundException("구매 기록을 찾을 수 없어요.");
    }

    await this.householdItemsService.ensureFamilyMember(user.userId, purchase.householdItem.familyId);

    return {
      purchase: this.serializePurchase(purchase),
    };
  }

  private async findAccessibleItemWithRelations(userId: string, itemId: string) {
    const item = await this.prisma.householdItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
      },
      include: {
        purchaseRule: true,
        productLinks: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("생필품을 찾을 수 없어요.");
    }

    await this.householdItemsService.ensureFamilyMember(userId, item.familyId);

    return item;
  }

  private assertAmountMatches(
    quantity: Prisma.Decimal | null,
    unitPrice: Prisma.Decimal | null,
    totalAmount: Prisma.Decimal,
  ) {
    if (!quantity || !unitPrice) {
      return;
    }

    const expected = quantity.mul(unitPrice);
    const difference = expected.sub(totalAmount).abs();

    if (difference.gt(new Prisma.Decimal(1))) {
      throw new BadRequestException("구매 금액을 확인해 주세요.");
    }
  }

  private assertRuleOverrideAllowed(
    rule: { priceLimit: Prisma.Decimal | null; approvalThreshold: Prisma.Decimal | null } | null,
    totalAmount: Prisma.Decimal,
    confirmRuleOverride: boolean,
    role: FamilyRole,
  ) {
    const exceedsPriceLimit = rule?.priceLimit ? totalAmount.gt(rule.priceLimit) : false;
    const exceedsApprovalThreshold = rule?.approvalThreshold ? totalAmount.gt(rule.approvalThreshold) : false;

    if (!exceedsPriceLimit && !exceedsApprovalThreshold) {
      return;
    }

    if (!confirmRuleOverride) {
      throw new ConflictException("가족 확인이 필요한 금액이에요.");
    }

    if (role !== FamilyRole.OWNER && role !== FamilyRole.ADMIN) {
      throw new ForbiddenException("가족 관리자만 확인하고 기록할 수 있어요.");
    }
  }

  private createRequestPayloadHash(itemId: string, dto: CreateItemPurchaseDto) {
    const canonicalPayload = {
      householdItemId: itemId,
      productLinkId: dto.productLinkId ?? null,
      quantity: this.canonicalDecimal(dto.quantity),
      unitPrice: this.canonicalDecimal(dto.unitPrice),
      totalAmount: this.canonicalDecimal(dto.totalAmount),
      currency: this.normalizeCurrency(dto.currency),
      purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt).toISOString() : null,
      stockAfterPurchase: dto.stockAfterPurchase ?? null,
      note: this.normalizeOptionalText(dto.note),
    };

    return createHash("sha256").update(JSON.stringify(canonicalPayload)).digest("hex");
  }

  private assertSameIdempotencyPayload(
    purchase: PurchaseWithRelations,
    itemId: string,
    dto: CreateItemPurchaseDto,
    requestPayloadHash: string,
  ) {
    if (purchase.requestPayloadHash) {
      if (purchase.requestPayloadHash !== requestPayloadHash) {
        throw new ConflictException("같은 요청 ID로 다른 구매 정보가 전달됐어요.");
      }

      return;
    }

    if (!this.matchesLegacyPurchasePayload(purchase, itemId, dto)) {
      throw new ConflictException("같은 요청 ID로 다른 구매 정보가 전달됐어요.");
    }
  }

  private matchesLegacyPurchasePayload(purchase: PurchaseWithRelations, itemId: string, dto: CreateItemPurchaseDto) {
    if (purchase.householdItemId !== itemId) {
      return false;
    }

    if ((purchase.productLinkId ?? null) !== (dto.productLinkId ?? null)) {
      return false;
    }

    if (!this.decimalEquals(purchase.quantity, dto.quantity)) {
      return false;
    }

    if (!this.decimalEquals(purchase.unitPrice, dto.unitPrice)) {
      return false;
    }

    if (!this.decimalEquals(purchase.amount, dto.totalAmount)) {
      return false;
    }

    if (purchase.currency.toUpperCase() !== this.normalizeCurrency(dto.currency)) {
      return false;
    }

    if ((purchase.stockAfterPurchase ?? null) !== (dto.stockAfterPurchase ?? null)) {
      return false;
    }

    if ((purchase.note ?? null) !== this.normalizeOptionalText(dto.note)) {
      return false;
    }

    if (dto.purchasedAt && purchase.purchasedAt.getTime() !== new Date(dto.purchasedAt).getTime()) {
      return false;
    }

    return true;
  }

  private serializePurchase(purchase: PurchaseWithRelations) {
    const accountEntry = purchase.itemAccountLink?.accountEntry ?? null;

    return {
      id: purchase.id,
      requestId: purchase.requestId,
      householdItemId: purchase.householdItemId,
      householdItemName: purchase.householdItem.name,
      productLinkId: purchase.productLinkId,
      purchasedByMemberId: purchase.purchasedByMemberId,
      quantity: purchase.quantity === null ? null : Number(purchase.quantity),
      unitPrice: purchase.unitPrice === null ? null : Number(purchase.unitPrice),
      totalAmount: Number(purchase.amount),
      currency: purchase.currency,
      purchasedAt: purchase.purchasedAt,
      stockAfterPurchase: purchase.stockAfterPurchase,
      note: purchase.note,
      accountEntry: accountEntry
        ? {
            id: accountEntry.id,
            categoryId: accountEntry.accountCategoryId,
            categoryCode: accountEntry.accountCategory.code,
            categoryName: accountEntry.accountCategory.name,
            entryType: accountEntry.entryType,
            amount: Number(accountEntry.amount),
            currency: accountEntry.currency,
            occurredAt: accountEntry.spentAt,
            title: accountEntry.title,
            memo: accountEntry.memo,
          }
        : null,
      itemAccountLinkId: purchase.itemAccountLink?.id ?? null,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  private trimOptional(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeOptionalText(value: string | undefined | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeCurrency(value: string | undefined) {
    return (value ?? "KRW").toUpperCase();
  }

  private canonicalDecimal(value: number | undefined) {
    if (value === undefined) {
      return null;
    }

    return new Prisma.Decimal(value).toFixed(2);
  }

  private decimalEquals(value: Prisma.Decimal | null, requestedValue: number | undefined) {
    if (value === null || requestedValue === undefined) {
      return value === null && requestedValue === undefined;
    }

    return value.equals(new Prisma.Decimal(requestedValue));
  }

  private isUniqueRequestIdError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002" &&
      "meta" in error &&
      typeof error.meta === "object" &&
      error.meta !== null &&
      "target" in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes("requestId")
    );
  }
}
