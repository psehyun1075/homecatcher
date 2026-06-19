import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AccountEntryType, FamilyRole, Prisma } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAccountEntryDto } from "./dto/create-account-entry.dto";
import { ListAccountEntriesQueryDto } from "./dto/list-account-entries-query.dto";
import { MonthlySummaryQueryDto } from "./dto/monthly-summary-query.dto";
import { UpdateAccountEntryDto } from "./dto/update-account-entry.dto";

export const DEFAULT_ACCOUNT_CATEGORIES = [
  { code: "FIXED_EXPENSE", name: "고정지출", sortOrder: 10 },
  { code: "FOOD", name: "식비", sortOrder: 20 },
  { code: "GROCERIES", name: "식재료", sortOrder: 30 },
  { code: "HOUSEHOLD_SUPPLIES", name: "생필품", sortOrder: 40 },
  { code: "CHILD_EDUCATION", name: "아이·교육", sortOrder: 50 },
  { code: "VEHICLE", name: "교통·차량", sortOrder: 60 },
  { code: "SOCIAL_EVENTS", name: "경조사", sortOrder: 70 },
  { code: "TRAVEL_LEISURE", name: "여행·여가", sortOrder: 80 },
  { code: "OTHER", name: "기타", sortOrder: 90 },
] as const;

const accountEntryInclude = {
  accountCategory: true,
  itemAccountLink: {
    include: {
      itemPurchaseLog: true,
    },
  },
} satisfies Prisma.AccountEntryInclude;

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;
type AccountEntryWithCategory = Prisma.AccountEntryGetPayload<{ include: typeof accountEntryInclude }>;

@Injectable()
export class AccountbookService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCategories(user: CurrentUserPayload, familyId: string) {
    await this.ensureFamilyMember(user.userId, familyId);
    await this.ensureDefaultCategories(familyId);

    const categories = await this.prisma.accountCategory.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return {
      categories: categories.map((category) => this.serializeCategory(category)),
    };
  }

  async createEntry(user: CurrentUserPayload, familyId: string, dto: CreateAccountEntryDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);
    await this.ensureDefaultCategories(familyId);
    await this.ensureCategoryInFamily(familyId, dto.categoryId);

    const entry = await this.prisma.accountEntry.create({
      data: {
        familyId,
        accountCategoryId: dto.categoryId,
        entryType: dto.entryType,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency ?? "KRW",
        spentAt: new Date(dto.occurredAt),
        title: dto.title.trim(),
        memo: this.trimOptional(dto.memo),
        createdByMemberId: membership.id,
      },
      include: accountEntryInclude,
    });

    return {
      accountEntry: this.serializeEntry(entry),
    };
  }

  async listEntries(user: CurrentUserPayload, familyId: string, query: ListAccountEntriesQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);
    await this.ensureDefaultCategories(familyId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AccountEntryWhereInput = {
      familyId,
      deletedAt: null,
      ...(query.categoryId ? { accountCategoryId: query.categoryId } : {}),
      ...(query.entryType ? { entryType: query.entryType } : {}),
      ...(query.month ? { spentAt: this.monthWhere(query.month) } : {}),
    };

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.accountEntry.findMany({
        where,
        include: accountEntryInclude,
        orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountEntry.count({ where }),
    ]);

    return {
      entries: entries.map((entry) => this.serializeEntry(entry)),
      page,
      limit,
      total,
    };
  }

  async getEntry(user: CurrentUserPayload, entryId: string) {
    const entry = await this.findEntry(entryId);
    await this.ensureFamilyMember(user.userId, entry.familyId);

    return {
      accountEntry: this.serializeEntry(entry),
    };
  }

  async updateEntry(user: CurrentUserPayload, entryId: string, dto: UpdateAccountEntryDto) {
    const entry = await this.findEntry(entryId);
    const membership = await this.ensureFamilyMember(user.userId, entry.familyId);
    this.ensureCanMutate(membership, entry);

    if (dto.categoryId) {
      await this.ensureCategoryInFamily(entry.familyId, dto.categoryId);
    }

    const updated = await this.prisma.accountEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        ...(dto.categoryId !== undefined ? { accountCategoryId: dto.categoryId } : {}),
        ...(dto.entryType !== undefined ? { entryType: dto.entryType } : {}),
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.occurredAt !== undefined ? { spentAt: new Date(dto.occurredAt) } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.memo !== undefined ? { memo: this.trimOptional(dto.memo) } : {}),
      },
      include: accountEntryInclude,
    });

    return {
      accountEntry: this.serializeEntry(updated),
    };
  }

  async deleteEntry(user: CurrentUserPayload, entryId: string) {
    const entry = await this.findEntry(entryId);
    const membership = await this.ensureFamilyMember(user.userId, entry.familyId);
    this.ensureCanMutate(membership, entry);

    const deleted = await this.prisma.accountEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        deletedAt: new Date(),
      },
      include: accountEntryInclude,
    });

    return {
      accountEntry: this.serializeEntry(deleted),
    };
  }

  async getMonthlySummary(user: CurrentUserPayload, familyId: string, query: MonthlySummaryQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);
    await this.ensureDefaultCategories(familyId);

    const entries = await this.prisma.accountEntry.findMany({
      where: {
        familyId,
        entryType: AccountEntryType.EXPENSE,
        deletedAt: null,
        spentAt: this.monthWhere(query.month),
      },
      include: {
        accountCategory: true,
      },
    });

    const grouped = new Map<string, { categoryCode: string; categoryName: string; amount: number; entryCount: number }>();
    let totalExpense = 0;

    for (const entry of entries) {
      const amount = Number(entry.amount);
      totalExpense += amount;
      const key = entry.accountCategory.code;
      const existing = grouped.get(key);

      if (existing) {
        existing.amount += amount;
        existing.entryCount += 1;
      } else {
        grouped.set(key, {
          categoryCode: entry.accountCategory.code,
          categoryName: entry.accountCategory.name,
          amount,
          entryCount: 1,
        });
      }
    }

    return {
      month: query.month,
      totalExpense,
      categorySummaries: Array.from(grouped.values()).sort((a, b) => a.categoryCode.localeCompare(b.categoryCode)),
    };
  }

  async ensureDefaultCategories(familyId: string, client: PrismaWriteClient = this.prisma) {
    for (const category of DEFAULT_ACCOUNT_CATEGORIES) {
      await client.accountCategory.upsert({
        where: {
          familyId_code: {
            familyId,
            code: category.code,
          },
        },
        update: {
          name: category.name,
          categoryType: AccountEntryType.EXPENSE,
          sortOrder: category.sortOrder,
          isSystem: true,
          deletedAt: null,
        },
        create: {
          familyId,
          code: category.code,
          name: category.name,
          categoryType: AccountEntryType.EXPENSE,
          sortOrder: category.sortOrder,
          isSystem: true,
        },
      });
    }
  }

  async getDefaultCategory(familyId: string, code: string, client: PrismaWriteClient = this.prisma) {
    await this.ensureDefaultCategories(familyId, client);

    const category = await client.accountCategory.findUnique({
      where: {
        familyId_code: {
          familyId,
          code,
        },
      },
    });

    if (!category || category.deletedAt) {
      throw new NotFoundException("가계부 카테고리를 찾을 수 없어요.");
    }

    return category;
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
      throw new ForbiddenException("이 가족의 가계부에 접근할 수 없어요.");
    }

    return membership;
  }

  serializeEntry(entry: AccountEntryWithCategory) {
    return {
      id: entry.id,
      familyId: entry.familyId,
      categoryId: entry.accountCategoryId,
      categoryCode: entry.accountCategory.code,
      categoryName: entry.accountCategory.name,
      entryType: entry.entryType,
      amount: Number(entry.amount),
      currency: entry.currency,
      occurredAt: entry.spentAt,
      title: entry.title,
      memo: entry.memo,
      createdByMemberId: entry.createdByMemberId,
      itemPurchaseLogId: entry.itemAccountLink?.itemPurchaseLogId ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
    };
  }

  private async findEntry(entryId: string) {
    const entry = await this.prisma.accountEntry.findFirst({
      where: {
        id: entryId,
        deletedAt: null,
      },
      include: accountEntryInclude,
    });

    if (!entry) {
      throw new NotFoundException("가계부 기록을 찾을 수 없어요.");
    }

    return entry;
  }

  private ensureCanMutate(
    membership: { id: string; role: FamilyRole },
    entry: { createdByMemberId: string | null },
  ) {
    if (membership.role === FamilyRole.OWNER || membership.role === FamilyRole.ADMIN) {
      return;
    }

    if (entry.createdByMemberId === membership.id) {
      return;
    }

    throw new ForbiddenException("이 가계부 기록은 수정할 수 없어요.");
  }

  private async ensureCategoryInFamily(familyId: string, categoryId: string) {
    const category = await this.prisma.accountCategory.findFirst({
      where: {
        id: categoryId,
        familyId,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new ForbiddenException("이 가족의 가계부에 접근할 수 없어요.");
    }
  }

  private serializeCategory(category: {
    id: string;
    familyId: string;
    code: string;
    name: string;
    categoryType: AccountEntryType;
    sortOrder: number;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: category.id,
      familyId: category.familyId,
      code: category.code,
      name: category.name,
      categoryType: category.categoryType,
      sortOrder: category.sortOrder,
      isSystem: category.isSystem,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private monthWhere(month: string) {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    return {
      gte: start,
      lt: end,
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
