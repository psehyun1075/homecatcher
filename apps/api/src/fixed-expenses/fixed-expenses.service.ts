import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AccountEntryType, FamilyRole, FixedExpenseStatus, Prisma, RecurrenceType } from "@prisma/client";
import { createHash } from "crypto";

import { AccountbookService } from "../accountbook/accountbook.service";
import { ActivityWriterService } from "../activity-feed/activity-writer.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import {
  addLocalDays,
  assertValidDateKey,
  assertValidTimezone,
  enumerateOccurrences,
  localDateTimeToUtc,
  parseDateKey,
} from "../common/calendar-date.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFixedExpenseDto } from "./dto/create-fixed-expense.dto";
import { CreateFixedExpensePaymentDto } from "./dto/create-fixed-expense-payment.dto";
import { ListFixedExpensesQueryDto } from "./dto/list-fixed-expenses-query.dto";
import { UpdateFixedExpenseRemindersDto } from "./dto/update-fixed-expense-reminders.dto";
import { UpdateFixedExpenseDto } from "./dto/update-fixed-expense.dto";

const fixedExpenseInclude = {
  createdByMember: true,
  accountCategory: true,
  reminders: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ daysBefore: "desc" as const }, { createdAt: "asc" as const }],
  },
  payments: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ dueDate: "desc" as const }],
  },
} satisfies Prisma.FixedExpenseInclude;

const paymentInclude = {
  fixedExpense: true,
  paidByMember: true,
  accountEntry: {
    include: {
      accountCategory: true,
    },
  },
} satisfies Prisma.FixedExpensePaymentInclude;

type FixedExpenseWithRelations = Prisma.FixedExpenseGetPayload<{ include: typeof fixedExpenseInclude }>;
type FixedExpensePaymentWithRelations = Prisma.FixedExpensePaymentGetPayload<{ include: typeof paymentInclude }>;

@Injectable()
export class FixedExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccountbookService) private readonly accountbookService: AccountbookService,
    @Inject(ActivityWriterService) private readonly activityWriter: ActivityWriterService,
  ) {}

  async listFixedExpenses(user: CurrentUserPayload, familyId: string, query: ListFixedExpensesQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.FixedExpenseWhereInput = {
      familyId,
      deletedAt: null,
    };

    const [fixedExpenses, total] = await this.prisma.$transaction([
      this.prisma.fixedExpense.findMany({
        where,
        include: fixedExpenseInclude,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fixedExpense.count({ where }),
    ]);

    return {
      fixedExpenses: fixedExpenses.map((fixedExpense) => this.serializeFixedExpense(fixedExpense)),
      page,
      limit,
      total,
    };
  }

  async createFixedExpense(user: CurrentUserPayload, familyId: string, dto: CreateFixedExpenseDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);
    this.ensureOwnerOrAdmin(membership);
    this.validateRecurrence(dto);
    assertValidTimezone(dto.timezone ?? "Asia/Seoul");

    if (dto.categoryId) {
      await this.ensureCategoryInFamily(familyId, dto.categoryId);
    }

    const fixedExpense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fixedExpense.create({
        data: {
          familyId,
          createdByMemberId: membership.id,
          accountCategoryId: dto.categoryId ?? null,
          title: dto.title.trim(),
          amount: new Prisma.Decimal(dto.amount),
          currency: this.normalizeCurrency(dto.currency),
          recurrenceType: dto.recurrenceType,
          dayOfMonth: dto.dayOfMonth ?? this.defaultDayOfMonth(dto.startDate),
          dayOfWeek: dto.dayOfWeek ?? null,
          intervalValue: dto.intervalValue ?? null,
          startDate: this.dateKeyToUtc(dto.startDate),
          endDate: dto.endDate ? this.dateKeyToUtc(dto.endDate) : null,
          dueTime: dto.dueTime ?? "09:00",
          timezone: dto.timezone ?? "Asia/Seoul",
          memo: this.trimOptional(dto.memo),
          dueDay: dto.dayOfMonth ?? this.defaultDayOfMonth(dto.startDate),
          repeatRule: this.toRepeatRule(dto),
          status: FixedExpenseStatus.ACTIVE,
          isActive: true,
        },
      });

      await this.replaceReminders(tx, created.id, dto.reminders ?? [], dto.startDate, dto.timezone ?? "Asia/Seoul");

      return tx.fixedExpense.findUniqueOrThrow({
        where: {
          id: created.id,
        },
        include: fixedExpenseInclude,
      });
    });

    return {
      fixedExpense: this.serializeFixedExpense(fixedExpense),
    };
  }

  async getFixedExpense(user: CurrentUserPayload, fixedExpenseId: string) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    await this.ensureFamilyMember(user.userId, fixedExpense.familyId);

    return {
      fixedExpense: this.serializeFixedExpense(fixedExpense),
    };
  }

  async updateFixedExpense(user: CurrentUserPayload, fixedExpenseId: string, dto: UpdateFixedExpenseDto) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    const membership = await this.ensureFamilyMember(user.userId, fixedExpense.familyId);
    this.ensureOwnerOrAdmin(membership);
    const merged = {
      recurrenceType: dto.recurrenceType ?? fixedExpense.recurrenceType,
      dayOfMonth: dto.dayOfMonth !== undefined ? dto.dayOfMonth : fixedExpense.dayOfMonth,
      dayOfWeek: dto.dayOfWeek !== undefined ? dto.dayOfWeek : fixedExpense.dayOfWeek,
      intervalValue: dto.intervalValue !== undefined ? dto.intervalValue : fixedExpense.intervalValue,
      startDate: dto.startDate ?? this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt),
      endDate: dto.endDate !== undefined ? dto.endDate : fixedExpense.endDate ? this.utcDateToDateKey(fixedExpense.endDate) : null,
      timezone: dto.timezone ?? fixedExpense.timezone,
    };
    this.validateRecurrence(merged);
    assertValidTimezone(merged.timezone);

    if (dto.categoryId) {
      await this.ensureCategoryInFamily(fixedExpense.familyId, dto.categoryId);
    }

    const updated = await this.prisma.fixedExpense.update({
      where: {
        id: fixedExpense.id,
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.currency !== undefined ? { currency: this.normalizeCurrency(dto.currency) } : {}),
        ...(dto.categoryId !== undefined ? { accountCategoryId: dto.categoryId } : {}),
        ...(dto.recurrenceType !== undefined ? { recurrenceType: dto.recurrenceType } : {}),
        ...(dto.dayOfMonth !== undefined ? { dayOfMonth: dto.dayOfMonth, dueDay: dto.dayOfMonth ?? fixedExpense.dueDay } : {}),
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.intervalValue !== undefined ? { intervalValue: dto.intervalValue } : {}),
        ...(dto.startDate !== undefined ? { startDate: this.dateKeyToUtc(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? this.dateKeyToUtc(dto.endDate) : null } : {}),
        ...(dto.dueTime !== undefined ? { dueTime: dto.dueTime } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.memo !== undefined ? { memo: this.trimOptional(dto.memo) } : {}),
        ...(dto.isActive !== undefined
          ? { isActive: dto.isActive, status: dto.isActive ? FixedExpenseStatus.ACTIVE : FixedExpenseStatus.PAUSED }
          : {}),
      },
      include: fixedExpenseInclude,
    });

    return {
      fixedExpense: this.serializeFixedExpense(updated),
    };
  }

  async deleteFixedExpense(user: CurrentUserPayload, fixedExpenseId: string) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    const membership = await this.ensureFamilyMember(user.userId, fixedExpense.familyId);
    this.ensureOwnerOrAdmin(membership);

    const deleted = await this.prisma.fixedExpense.update({
      where: {
        id: fixedExpense.id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: FixedExpenseStatus.CANCELED,
        reminders: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
            },
          },
        },
      },
      include: fixedExpenseInclude,
    });

    return {
      fixedExpense: this.serializeFixedExpense(deleted),
    };
  }

  async listReminders(user: CurrentUserPayload, fixedExpenseId: string) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    await this.ensureFamilyMember(user.userId, fixedExpense.familyId);

    return {
      reminders: fixedExpense.reminders.map((reminder) => this.serializeReminder(reminder)),
    };
  }

  async updateReminders(user: CurrentUserPayload, fixedExpenseId: string, dto: UpdateFixedExpenseRemindersDto) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    const membership = await this.ensureFamilyMember(user.userId, fixedExpense.familyId);
    this.ensureOwnerOrAdmin(membership);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.replaceReminders(
        tx,
        fixedExpense.id,
        dto.reminders,
        this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt),
        fixedExpense.timezone,
      );

      return tx.fixedExpense.findUniqueOrThrow({
        where: {
          id: fixedExpense.id,
        },
        include: fixedExpenseInclude,
      });
    });

    return {
      reminders: updated.reminders.map((reminder) => this.serializeReminder(reminder)),
    };
  }

  async createPayment(user: CurrentUserPayload, fixedExpenseId: string, dto: CreateFixedExpensePaymentDto) {
    const requestPayloadHash = this.createPaymentPayloadHash(fixedExpenseId, dto);
    const existing = await this.prisma.fixedExpensePayment.findUnique({
      where: {
        requestId: dto.requestId,
      },
      include: paymentInclude,
    });

    if (existing) {
      await this.ensureFamilyMember(user.userId, existing.familyId);
      this.assertSamePaymentPayload(existing, fixedExpenseId, dto, requestPayloadHash);

      return {
        payment: this.serializePayment(existing),
        idempotent: true,
      };
    }

    const fixedExpense = await this.findPayableFixedExpense(user.userId, fixedExpenseId);
    const membership = await this.ensureFamilyMember(user.userId, fixedExpense.familyId);
    const amount = new Prisma.Decimal(dto.amount);
    const currency = this.normalizeCurrency(dto.currency);
    assertValidDateKey(dto.dueDate, "고정지출 납부 예정일을 확인해 주세요.");
    this.ensureValidPaymentDueDate(fixedExpense, dto.dueDate);
    const dueDate = this.dateKeyToUtc(dto.dueDate);
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const category = fixedExpense.accountCategoryId
          ? await tx.accountCategory.findFirst({
              where: {
                id: fixedExpense.accountCategoryId,
                familyId: fixedExpense.familyId,
                deletedAt: null,
              },
            })
          : await this.accountbookService.getDefaultCategory(fixedExpense.familyId, "FIXED_EXPENSE", tx);

        if (!category) {
          throw new NotFoundException("가계부 카테고리를 찾을 수 없어요.");
        }

        const accountEntry = await tx.accountEntry.create({
          data: {
            familyId: fixedExpense.familyId,
            accountCategoryId: category.id,
            entryType: AccountEntryType.EXPENSE,
            amount,
            currency,
            spentAt: paidAt,
            title: `${fixedExpense.title} 납부`,
            memo: this.trimOptional(dto.note),
            createdByMemberId: membership.id,
          },
        });

        const created = await tx.fixedExpensePayment.create({
          data: {
            requestId: dto.requestId,
            requestPayloadHash,
            fixedExpenseId: fixedExpense.id,
            familyId: fixedExpense.familyId,
            dueDate,
            paidAt,
            amount,
            currency,
            paidByMemberId: membership.id,
            accountEntryId: accountEntry.id,
            note: this.trimOptional(dto.note),
          },
        });

        await this.activityWriter.recordFixedExpensePaid(tx, {
          paymentId: created.id,
          fixedExpenseId: fixedExpense.id,
          actorMemberId: membership.id,
          occurredAt: paidAt,
        });

        return tx.fixedExpensePayment.findUniqueOrThrow({
          where: {
            id: created.id,
          },
          include: paymentInclude,
        });
      });

      return {
        payment: this.serializePayment(payment),
        idempotent: false,
      };
    } catch (error) {
      if (this.isUniqueRequestIdError(error)) {
        const retried = await this.prisma.fixedExpensePayment.findUnique({
          where: {
            requestId: dto.requestId,
          },
          include: paymentInclude,
        });

        if (retried) {
          await this.ensureFamilyMember(user.userId, retried.familyId);
          this.assertSamePaymentPayload(retried, fixedExpenseId, dto, requestPayloadHash);

          return {
            payment: this.serializePayment(retried),
            idempotent: true,
          };
        }
      }

      if (this.isFixedExpenseDueDateUniqueError(error)) {
        throw new ConflictException("이미 납부 완료로 기록했어요.");
      }

      throw error;
    }
  }

  async listPayments(user: CurrentUserPayload, fixedExpenseId: string) {
    const fixedExpense = await this.findFixedExpense(fixedExpenseId);
    await this.ensureFamilyMember(user.userId, fixedExpense.familyId);

    const payments = await this.prisma.fixedExpensePayment.findMany({
      where: {
        fixedExpenseId: fixedExpense.id,
        deletedAt: null,
      },
      include: paymentInclude,
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      payments: payments.map((payment) => this.serializePayment(payment)),
    };
  }

  async getPayment(user: CurrentUserPayload, paymentId: string) {
    const payment = await this.prisma.fixedExpensePayment.findFirst({
      where: {
        id: paymentId,
        deletedAt: null,
      },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException("납부 기록을 찾을 수 없어요.");
    }

    await this.ensureFamilyMember(user.userId, payment.familyId);

    return {
      payment: this.serializePayment(payment),
    };
  }

  async findFixedExpense(fixedExpenseId: string) {
    const fixedExpense = await this.prisma.fixedExpense.findFirst({
      where: {
        id: fixedExpenseId,
        deletedAt: null,
      },
      include: fixedExpenseInclude,
    });

    if (!fixedExpense) {
      throw new NotFoundException("고정지출 정보를 찾을 수 없어요.");
    }

    return fixedExpense;
  }

  private async findPayableFixedExpense(userId: string, fixedExpenseId: string) {
    const fixedExpense = await this.prisma.fixedExpense.findFirst({
      where: {
        id: fixedExpenseId,
      },
      include: fixedExpenseInclude,
    });

    if (!fixedExpense) {
      throw new NotFoundException("현재 사용할 수 없는 고정지출이에요.");
    }

    await this.ensureFamilyMember(userId, fixedExpense.familyId);

    if (fixedExpense.deletedAt || !fixedExpense.isActive || fixedExpense.status !== FixedExpenseStatus.ACTIVE) {
      throw new ConflictException("현재 사용할 수 없는 고정지출이에요.");
    }

    return fixedExpense;
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
      throw new ForbiddenException("가족 캘린더에 접근할 수 없어요.");
    }

    return membership;
  }

  private ensureOwnerOrAdmin(membership: { role: FamilyRole }) {
    if (membership.role === FamilyRole.OWNER || membership.role === FamilyRole.ADMIN) {
      return;
    }

    throw new ForbiddenException("고정지출 알림은 가족 관리자만 바꿀 수 있어요.");
  }

  private validateRecurrence(dto: {
    recurrenceType: RecurrenceType;
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    intervalValue?: number | null;
    startDate: string;
    endDate?: string | null;
  }) {
    assertValidDateKey(dto.startDate);
    if (dto.endDate) {
      assertValidDateKey(dto.endDate);
    }

    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException("고정지출 반복 날짜를 확인해 주세요.");
    }

    if (dto.recurrenceType === RecurrenceType.WEEKLY && dto.dayOfWeek == null) {
      throw new BadRequestException("고정지출 반복 날짜를 확인해 주세요.");
    }

    if ((dto.recurrenceType === RecurrenceType.MONTHLY || dto.recurrenceType === RecurrenceType.YEARLY) && dto.dayOfMonth == null) {
      throw new BadRequestException("고정지출 반복 날짜를 확인해 주세요.");
    }

    if (dto.recurrenceType === RecurrenceType.INTERVAL_DAYS && !dto.intervalValue) {
      throw new BadRequestException("고정지출 반복 날짜를 확인해 주세요.");
    }
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

  private async replaceReminders(
    tx: Prisma.TransactionClient,
    fixedExpenseId: string,
    reminders: Array<{ daysBefore: number; remindTime: string; enabled: boolean }>,
    startDate: string,
    timezone: string,
  ) {
    if (new Set(reminders.map((reminder) => reminder.daysBefore)).size !== reminders.length) {
      throw new BadRequestException("같은 알림 날짜가 중복됐어요.");
    }

    await tx.fixedExpenseReminder.updateMany({
      where: {
        fixedExpenseId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    for (const reminder of reminders) {
      const remindAtBase = localDateTimeToUtc(startDate, reminder.remindTime, timezone);
      const remindAt = new Date(remindAtBase.getTime() - reminder.daysBefore * 24 * 60 * 60 * 1000);

      await tx.fixedExpenseReminder.upsert({
        where: {
          fixedExpenseId_daysBefore: {
            fixedExpenseId,
            daysBefore: reminder.daysBefore,
          },
        },
        update: {
          remindTime: reminder.remindTime,
          enabled: reminder.enabled,
          remindAt,
          isSent: false,
          sentAt: null,
          deletedAt: null,
        },
        create: {
          fixedExpenseId,
          daysBefore: reminder.daysBefore,
          remindTime: reminder.remindTime,
          enabled: reminder.enabled,
          remindAt,
        },
      });
    }
  }

  private createPaymentPayloadHash(fixedExpenseId: string, dto: CreateFixedExpensePaymentDto) {
    const payload = {
      fixedExpenseId,
      dueDate: dto.dueDate,
      paidAt: dto.paidAt ? new Date(dto.paidAt).toISOString() : null,
      amount: String(dto.amount),
      currency: this.normalizeCurrency(dto.currency),
      note: this.trimOptional(dto.note),
    };

    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private ensureValidPaymentDueDate(fixedExpense: FixedExpenseWithRelations, dueDate: string) {
    const timezone = fixedExpense.timezone || "Asia/Seoul";
    assertValidTimezone(timezone);
    const rangeStart = localDateTimeToUtc(dueDate, "00:00", timezone);
    const rangeEnd = addLocalDays(rangeStart, 1, timezone);
    const startDate = this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt);
    const startParts = parseDateKey(startDate);
    const occurrences = enumerateOccurrences({
      recurrenceType: fixedExpense.recurrenceType,
      startDate,
      endDate: fixedExpense.endDate ? this.utcDateToDateKey(fixedExpense.endDate) : null,
      dueTime: fixedExpense.dueTime ?? "09:00",
      timezone,
      rangeStart,
      rangeEnd,
      dayOfMonth: fixedExpense.dayOfMonth ?? startParts.day,
      dayOfWeek: fixedExpense.dayOfWeek ?? new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day)).getUTCDay(),
      intervalValue: fixedExpense.intervalValue ?? 1,
      monthOfYear: startParts.month,
      dayOfYearMonth: fixedExpense.dayOfMonth ?? startParts.day,
    });

    if (!occurrences.some((occurrence) => occurrence.dateKey === dueDate)) {
      throw new BadRequestException("고정지출 납부 예정일을 확인해 주세요.");
    }
  }

  private assertSamePaymentPayload(
    payment: FixedExpensePaymentWithRelations,
    fixedExpenseId: string,
    dto: CreateFixedExpensePaymentDto,
    requestPayloadHash: string,
  ) {
    if (payment.requestPayloadHash) {
      if (payment.requestPayloadHash !== requestPayloadHash) {
        throw new ConflictException("같은 요청 ID로 다른 납부 정보가 전달됐어요.");
      }

      return;
    }

    const same =
      payment.fixedExpenseId === fixedExpenseId &&
      this.utcDateToDateKey(payment.dueDate) === dto.dueDate &&
      (!dto.paidAt || payment.paidAt.getTime() === new Date(dto.paidAt).getTime()) &&
      payment.amount.equals(new Prisma.Decimal(dto.amount)) &&
      payment.currency === this.normalizeCurrency(dto.currency) &&
      (payment.note ?? null) === this.trimOptional(dto.note);

    if (!same) {
      throw new ConflictException("같은 요청 ID로 다른 납부 정보가 전달됐어요.");
    }
  }

  private isUniqueRequestIdError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("requestId")
    );
  }

  private isFixedExpenseDueDateUniqueError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("fixedExpenseId") &&
      error.meta.target.includes("dueDate")
    );
  }

  private serializeFixedExpense(fixedExpense: FixedExpenseWithRelations) {
    return {
      id: fixedExpense.id,
      familyId: fixedExpense.familyId,
      title: fixedExpense.title,
      amount: Number(fixedExpense.amount),
      currency: fixedExpense.currency,
      categoryId: fixedExpense.accountCategoryId,
      recurrenceType: fixedExpense.recurrenceType,
      dayOfMonth: fixedExpense.dayOfMonth,
      dayOfWeek: fixedExpense.dayOfWeek,
      intervalValue: fixedExpense.intervalValue,
      startDate: this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt),
      endDate: fixedExpense.endDate ? this.utcDateToDateKey(fixedExpense.endDate) : null,
      dueTime: fixedExpense.dueTime,
      timezone: fixedExpense.timezone,
      memo: fixedExpense.memo,
      isActive: fixedExpense.isActive,
      status: fixedExpense.status,
      createdByMemberId: fixedExpense.createdByMemberId,
      reminders: fixedExpense.reminders.map((reminder) => this.serializeReminder(reminder)),
      createdAt: fixedExpense.createdAt,
      updatedAt: fixedExpense.updatedAt,
      deletedAt: fixedExpense.deletedAt,
    };
  }

  private serializeReminder(reminder: { id: string; fixedExpenseId: string; daysBefore: number; remindTime: string; enabled: boolean }) {
    return {
      id: reminder.id,
      fixedExpenseId: reminder.fixedExpenseId,
      daysBefore: reminder.daysBefore,
      remindTime: reminder.remindTime,
      enabled: reminder.enabled,
    };
  }

  private serializePayment(payment: FixedExpensePaymentWithRelations) {
    return {
      id: payment.id,
      requestId: payment.requestId,
      fixedExpenseId: payment.fixedExpenseId,
      familyId: payment.familyId,
      dueDate: this.utcDateToDateKey(payment.dueDate),
      paidAt: payment.paidAt,
      amount: Number(payment.amount),
      currency: payment.currency,
      paidByMemberId: payment.paidByMemberId,
      accountEntryId: payment.accountEntryId,
      note: payment.note,
      accountEntry: {
        id: payment.accountEntry.id,
        title: payment.accountEntry.title,
        amount: Number(payment.accountEntry.amount),
        currency: payment.accountEntry.currency,
        occurredAt: payment.accountEntry.spentAt,
        categoryCode: payment.accountEntry.accountCategory.code,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      deletedAt: payment.deletedAt,
    };
  }

  private toRepeatRule(dto: { recurrenceType: RecurrenceType; dayOfMonth?: number | null; dayOfWeek?: number | null; intervalValue?: number | null }) {
    return {
      recurrenceType: dto.recurrenceType,
      dayOfMonth: dto.dayOfMonth ?? null,
      dayOfWeek: dto.dayOfWeek ?? null,
      intervalValue: dto.intervalValue ?? null,
    };
  }

  private defaultDayOfMonth(startDate: string) {
    return parseDateKey(startDate).day;
  }

  private dateKeyToUtc(dateKey: string) {
    assertValidDateKey(dateKey);
    const parts = parseDateKey(dateKey);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  }

  private utcDateToDateKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  private normalizeCurrency(currency?: string | null) {
    return (currency ?? "KRW").trim().toUpperCase();
  }

  private trimOptional(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
