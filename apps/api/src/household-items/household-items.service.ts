import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHouseholdItemDto } from "./dto/create-household-item.dto";
import { UpdateHouseholdItemDto } from "./dto/update-household-item.dto";

const householdItemInclude = {
  productLinks: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  purchaseRule: true,
};

type HouseholdItemWithLinks = Prisma.HouseholdItemGetPayload<{
  include: typeof householdItemInclude;
}>;

@Injectable()
export class HouseholdItemsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listItems(user: CurrentUserPayload, familyId: string) {
    await this.ensureFamilyMember(user.userId, familyId);

    const items = await this.prisma.householdItem.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      include: householdItemInclude,
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      householdItems: items.map((item) => this.serializeHouseholdItem(item)),
    };
  }

  async createItem(user: CurrentUserPayload, familyId: string, dto: CreateHouseholdItemDto) {
    await this.ensureFamilyMember(user.userId, familyId);

    const item = await this.prisma.householdItem.create({
      data: {
        familyId,
        createdByUserId: user.userId,
        name: dto.name.trim(),
        category: this.trimOptional(dto.category),
        unit: this.trimOptional(dto.unit),
        minStock: dto.minStock,
        cycleDays: dto.cycleDays,
        memo: this.trimOptional(dto.memo),
      },
      include: householdItemInclude,
    });

    return {
      householdItem: this.serializeHouseholdItem(item),
    };
  }

  async getItem(user: CurrentUserPayload, itemId: string) {
    const item = await this.findAccessibleItem(user.userId, itemId);

    return {
      householdItem: this.serializeHouseholdItem(item),
    };
  }

  async updateItem(user: CurrentUserPayload, itemId: string, dto: UpdateHouseholdItemDto) {
    const item = await this.findAccessibleItem(user.userId, itemId);

    const updated = await this.prisma.householdItem.update({
      where: {
        id: item.id,
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: this.trimOptional(dto.category) } : {}),
        ...(dto.unit !== undefined ? { unit: this.trimOptional(dto.unit) } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.cycleDays !== undefined ? { cycleDays: dto.cycleDays } : {}),
        ...(dto.memo !== undefined ? { memo: this.trimOptional(dto.memo) } : {}),
      },
      include: householdItemInclude,
    });

    return {
      householdItem: this.serializeHouseholdItem(updated),
    };
  }

  async deleteItem(user: CurrentUserPayload, itemId: string) {
    const item = await this.findAccessibleItem(user.userId, itemId);
    const now = new Date();

    await this.prisma.householdItem.update({
      where: {
        id: item.id,
      },
      data: {
        deletedAt: now,
        productLinks: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: now,
            },
          },
        },
      },
    });

    return {
      householdItem: {
        id: item.id,
        deletedAt: now,
      },
    };
  }

  async findAccessibleItem(userId: string, itemId: string) {
    const item = await this.prisma.householdItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
      },
      include: householdItemInclude,
    });

    if (!item) {
      throw new NotFoundException("생필품을 찾을 수 없어요.");
    }

    await this.ensureFamilyMember(userId, item.familyId);

    return item;
  }

  async ensureFamilyMember(userId: string, familyId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
      include: {
        family: true,
      },
    });

    if (!membership || membership.deletedAt || !membership.family || membership.family.deletedAt) {
      throw new ForbiddenException("이 가족의 생필품에 접근할 수 없어요.");
    }

    return membership;
  }

  serializeHouseholdItem(item: HouseholdItemWithLinks) {
    return {
      id: item.id,
      familyId: item.familyId,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock,
      cycleDays: item.cycleDays,
      memo: item.memo,
      createdByUserId: item.createdByUserId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      productLinks: item.productLinks.map((link) => ({
        id: link.id,
        url: link.url,
        productName: link.productName,
        mallName: link.mallName,
        productImageUrl: link.productImageUrl,
        price: link.lastPrice === null ? null : Number(link.lastPrice),
        currency: link.currency,
        metadataStatus: link.metadataStatus,
        metadataSource: link.metadataSource,
        fetchedAt: link.previewedAt,
        isPrimary: link.isPrimary,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })),
      purchaseRule: item.purchaseRule
        ? {
            id: item.purchaseRule.id,
            exactOnly: item.purchaseRule.exactOnly,
            priceLimit: item.purchaseRule.priceLimit === null ? null : Number(item.purchaseRule.priceLimit),
            approvalThreshold:
              item.purchaseRule.approvalThreshold === null ? null : Number(item.purchaseRule.approvalThreshold),
            preferredMallName: item.purchaseRule.preferredMallName,
          }
        : null,
    };
  }

  private trimOptional(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
