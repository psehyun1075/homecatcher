import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { HouseholdItemsService } from "../household-items/household-items.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductLinkDto } from "./dto/create-product-link.dto";
import { UpdateProductLinkDto } from "./dto/update-product-link.dto";
import { ProductPreviewResult, ProductPreviewService } from "./product-preview.service";

const productLinkInclude = {
  householdItem: true,
};

type ProductLinkWithItem = Prisma.ProductLinkGetPayload<{
  include: typeof productLinkInclude;
}>;

@Injectable()
export class ProductLinksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HouseholdItemsService) private readonly householdItemsService: HouseholdItemsService,
    @Inject(ProductPreviewService) private readonly productPreviewService: ProductPreviewService,
  ) {}

  async preview(dto: { url: string }) {
    const preview = await this.productPreviewService.preview(dto.url);

    return {
      preview,
    };
  }

  async createProductLink(user: CurrentUserPayload, itemId: string, dto: CreateProductLinkDto) {
    const item = await this.householdItemsService.findAccessibleItem(user.userId, itemId);
    const preview = await this.productPreviewService.preview(dto.url);
    const existingCount = await this.prisma.productLink.count({
      where: {
        householdItemId: item.id,
        deletedAt: null,
      },
    });
    const isPrimary = dto.isPrimary ?? existingCount === 0;

    const productLink = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productLink.updateMany({
          where: {
            householdItemId: item.id,
            deletedAt: null,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productLink.create({
        data: {
          householdItemId: item.id,
          isPrimary,
          ...this.toProductLinkData(preview),
        },
        include: productLinkInclude,
      });
    });

    return {
      productLink: this.serializeProductLink(productLink),
    };
  }

  async updateProductLink(user: CurrentUserPayload, productLinkId: string, dto: UpdateProductLinkDto) {
    const existing = await this.findAccessibleProductLink(user.userId, productLinkId);
    const preview = dto.url ? await this.productPreviewService.preview(dto.url) : undefined;

    const productLink = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.productLink.updateMany({
          where: {
            householdItemId: existing.householdItemId,
            deletedAt: null,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productLink.update({
        where: {
          id: existing.id,
        },
        data: {
          ...(preview ? this.toProductLinkData(preview) : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        },
        include: productLinkInclude,
      });
    });

    return {
      productLink: this.serializeProductLink(productLink),
    };
  }

  async refreshProductLink(user: CurrentUserPayload, productLinkId: string) {
    const existing = await this.findAccessibleProductLink(user.userId, productLinkId);
    const preview = await this.productPreviewService.preview(existing.url);

    const productLink = await this.prisma.productLink.update({
      where: {
        id: existing.id,
      },
      data: this.toProductLinkData(preview),
      include: productLinkInclude,
    });

    return {
      productLink: this.serializeProductLink(productLink),
    };
  }

  async getReorderPreview(user: CurrentUserPayload, itemId: string) {
    const item = await this.householdItemsService.findAccessibleItem(user.userId, itemId);
    const primaryLink =
      item.productLinks.find((link) => link.isPrimary) ??
      item.productLinks.find((link) => link.deletedAt === null) ??
      null;

    return {
      reorderPreview: {
        householdItem: {
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          minStock: item.minStock,
          cycleDays: item.cycleDays,
          memo: item.memo,
        },
        primaryProductLink: primaryLink
          ? {
              id: primaryLink.id,
              url: primaryLink.url,
              productName: primaryLink.productName,
              mallName: primaryLink.mallName,
              productImageUrl: primaryLink.productImageUrl,
              price: primaryLink.lastPrice === null ? null : Number(primaryLink.lastPrice),
              currency: primaryLink.currency,
              metadataStatus: primaryLink.metadataStatus,
              metadataSource: primaryLink.metadataSource,
              fetchedAt: primaryLink.previewedAt,
            }
          : null,
        purchaseRule: item.purchaseRule
          ? {
              exactOnly: item.purchaseRule.exactOnly,
              priceLimit: item.purchaseRule.priceLimit === null ? null : Number(item.purchaseRule.priceLimit),
              approvalThreshold:
                item.purchaseRule.approvalThreshold === null ? null : Number(item.purchaseRule.approvalThreshold),
              preferredMallName: item.purchaseRule.preferredMallName,
            }
          : null,
      },
    };
  }

  private async findAccessibleProductLink(userId: string, productLinkId: string) {
    const productLink = await this.prisma.productLink.findFirst({
      where: {
        id: productLinkId,
        deletedAt: null,
        householdItem: {
          deletedAt: null,
        },
      },
      include: productLinkInclude,
    });

    if (!productLink) {
      throw new NotFoundException("상품 URL을 찾을 수 없어요.");
    }

    try {
      await this.householdItemsService.ensureFamilyMember(userId, productLink.householdItem.familyId);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException("이 생필품의 상품 URL에 접근할 수 없어요.");
      }

      throw error;
    }

    return productLink;
  }

  private toProductLinkData(preview: ProductPreviewResult) {
    return {
      url: preview.url,
      productName: preview.productName,
      mallName: preview.mallName,
      productImageUrl: preview.productImageUrl,
      lastPrice: preview.price === null ? null : new Prisma.Decimal(preview.price),
      currency: preview.currency,
      metadataStatus: preview.metadataStatus,
      metadataSource: preview.metadataSource,
      previewedAt: preview.fetchedAt,
    };
  }

  private serializeProductLink(productLink: ProductLinkWithItem) {
    return {
      id: productLink.id,
      householdItemId: productLink.householdItemId,
      url: productLink.url,
      productName: productLink.productName,
      mallName: productLink.mallName,
      productImageUrl: productLink.productImageUrl,
      price: productLink.lastPrice === null ? null : Number(productLink.lastPrice),
      currency: productLink.currency,
      metadataStatus: productLink.metadataStatus,
      metadataSource: productLink.metadataSource,
      fetchedAt: productLink.previewedAt,
      isPrimary: productLink.isPrimary,
      createdAt: productLink.createdAt,
      updatedAt: productLink.updatedAt,
    };
  }
}
