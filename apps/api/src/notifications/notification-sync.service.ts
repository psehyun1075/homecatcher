import { Inject, Injectable } from "@nestjs/common";
import { FamilyRole, NotificationStatus, NotificationType, Prisma, RecurrenceType, TodoScheduleType } from "@prisma/client";

import {
  addLocalDays,
  enumerateOccurrences,
  formatDateKey,
  getZonedParts,
  localDateTimeToUtc,
} from "../common/calendar-date.util";
import { PrismaService } from "../prisma/prisma.service";

interface SyncOptions {
  now?: Date;
  horizonDays?: number;
}

interface PlannedNotification {
  userId: string;
  familyId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string;
  deepLink: string;
  dedupeKey: string;
  availableAt: Date;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationSyncService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async sync(options: SyncOptions = {}) {
    const now = options.now ?? new Date();
    const horizonEnd = new Date(now.getTime() + (options.horizonDays ?? 35) * 24 * 60 * 60 * 1000);
    const planned: PlannedNotification[] = [
      ...(await this.planTodoDue(now, horizonEnd)),
      ...(await this.planFixedExpenseDue(now, horizonEnd)),
      ...(await this.planFamilyEventStart(now, horizonEnd)),
      ...(await this.planHouseholdItemRunout(now, horizonEnd)),
    ];
    const desiredKeys = planned.map((notification) => notification.dedupeKey);

    await this.prisma.$transaction(async (tx) => {
      for (const notification of planned) {
        await tx.notification.upsert({
          where: { dedupeKey: notification.dedupeKey },
          update: {
            title: notification.title,
            message: notification.message,
            availableAt: notification.availableAt,
            scheduledAt: notification.availableAt,
            status: NotificationStatus.PENDING,
            archivedAt: null,
            deletedAt: null,
            payload: notification.payload ?? Prisma.JsonNull,
          },
          create: {
            userId: notification.userId,
            familyId: notification.familyId,
            notificationType: notification.notificationType,
            title: notification.title,
            message: notification.message,
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            deepLink: notification.deepLink,
            dedupeKey: notification.dedupeKey,
            availableAt: notification.availableAt,
            scheduledAt: notification.availableAt,
            payload: notification.payload ?? Prisma.JsonNull,
          },
        });
      }

      const where: Prisma.NotificationWhereInput = {
        notificationType: {
          in: [
            NotificationType.TODO_DUE,
            NotificationType.FIXED_EXPENSE_DUE,
            NotificationType.FAMILY_EVENT_START,
            NotificationType.HOUSEHOLD_ITEM_RUNOUT,
          ],
        },
        availableAt: { gt: now, lt: horizonEnd },
        status: NotificationStatus.PENDING,
        readAt: null,
        archivedAt: null,
        ...(desiredKeys.length > 0 ? { dedupeKey: { notIn: desiredKeys } } : {}),
      };
      const cancelled = await tx.notification.updateMany({
        where,
        data: { status: NotificationStatus.CANCELLED },
      });

      return cancelled;
    });

    return { plannedCount: planned.length, dedupeKeys: desiredKeys };
  }

  private async planTodoDue(now: Date, horizonEnd: Date) {
    const todos = await this.prisma.todoTask.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        NOT: {
          AND: [{ completedAt: { not: null } }, { schedules: { some: { scheduleType: TodoScheduleType.ONCE, deletedAt: null } } }],
        },
        schedules: { some: { deletedAt: null, isEnabled: true } },
      },
      include: {
        createdByMember: true,
        plannerMember: true,
        assigneeMember: true,
        schedules: { where: { deletedAt: null, isEnabled: true }, orderBy: { createdAt: "asc" } },
        family: { include: { members: { where: { deletedAt: null, role: { in: [FamilyRole.OWNER, FamilyRole.ADMIN] } } } } },
      },
    });
    const planned: PlannedNotification[] = [];

    for (const todo of todos) {
      const schedule = todo.schedules[0];
      const recurrenceType = this.mapTodoScheduleType(schedule?.scheduleType);
      if (!schedule || !recurrenceType) continue;
      const payload = this.toJsonObject(schedule.repeatRule);
      const timezone = schedule.timezone || "Asia/Seoul";
      const startAt = typeof payload.startAt === "string" ? new Date(payload.startAt) : schedule.nextDueAt ?? todo.createdAt;
      const startParts = getZonedParts(startAt, timezone);
      const occurrences = enumerateOccurrences({
        recurrenceType,
        startDate: formatDateKey(startAt, timezone),
        endDate: typeof payload.endAt === "string" ? formatDateKey(new Date(payload.endAt), timezone) : null,
        dueTime: `${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`,
        timezone,
        rangeStart: now,
        rangeEnd: horizonEnd,
        daysOfWeek: this.parseDaysOfWeek(payload.daysOfWeek, schedule.scheduleType),
        dayOfWeek: startParts.dayOfWeek,
        dayOfMonth: typeof payload.dayOfMonth === "number" ? payload.dayOfMonth : startParts.day,
        intervalValue: typeof payload.intervalValue === "number" ? payload.intervalValue : 1,
      });
      const targets = this.todoDueTargets(todo.assigneeMember, todo.plannerMember, todo.createdByMember, todo.family.members);

      for (const occurrence of occurrences) {
        if (occurrence.startsAt < now) continue;
        for (const member of targets) {
          if (!member.userId) continue;
          planned.push({
            userId: member.userId,
            familyId: todo.familyId,
            notificationType: NotificationType.TODO_DUE,
            title: "오늘 할 일이 있어요.",
            message: `${todo.title} 예정일이에요.`,
            sourceType: "TODO",
            sourceId: todo.id,
            deepLink: `/todos/${todo.id}`,
            dedupeKey: `TODO_DUE:${todo.id}:${occurrence.startsAt.toISOString()}:${member.userId}`,
            availableAt: occurrence.startsAt,
            payload: { dateKey: occurrence.dateKey },
          });
        }
      }
    }

    return planned;
  }

  private async planFixedExpenseDue(now: Date, horizonEnd: Date) {
    const fixedExpenses = await this.prisma.fixedExpense.findMany({
      where: { deletedAt: null, isActive: true, status: "ACTIVE" },
      include: {
        reminders: { where: { deletedAt: null, enabled: true } },
        payments: { where: { deletedAt: null } },
        family: { include: { members: { where: { deletedAt: null, role: { in: [FamilyRole.OWNER, FamilyRole.ADMIN] } } } } },
      },
    });
    const planned: PlannedNotification[] = [];

    for (const fixedExpense of fixedExpenses) {
      const timezone = fixedExpense.timezone || "Asia/Seoul";
      const startDate = this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt);
      const startParts = getZonedParts(localDateTimeToUtc(startDate, fixedExpense.dueTime ?? "09:00", timezone), timezone);
      const paidDueDates = new Set(fixedExpense.payments.map((payment) => this.utcDateToDateKey(payment.dueDate)));
      const occurrences = enumerateOccurrences({
        recurrenceType: fixedExpense.recurrenceType,
        startDate,
        endDate: fixedExpense.endDate ? this.utcDateToDateKey(fixedExpense.endDate) : null,
        dueTime: fixedExpense.dueTime ?? "09:00",
        timezone,
        rangeStart: now,
        rangeEnd: horizonEnd,
        dayOfMonth: fixedExpense.dayOfMonth ?? startParts.day,
        dayOfWeek: fixedExpense.dayOfWeek ?? startParts.dayOfWeek,
        intervalValue: fixedExpense.intervalValue ?? 1,
        monthOfYear: startParts.month,
        dayOfYearMonth: fixedExpense.dayOfMonth ?? startParts.day,
      });

      for (const occurrence of occurrences) {
        if (paidDueDates.has(occurrence.dateKey)) continue;
        for (const reminder of fixedExpense.reminders) {
          const availableAt = addLocalDays(localDateTimeToUtc(occurrence.dateKey, reminder.remindTime, timezone), -reminder.daysBefore, timezone);
          if (availableAt < now || availableAt >= horizonEnd) continue;
          for (const member of fixedExpense.family.members) {
            if (!member.userId) continue;
            planned.push({
              userId: member.userId,
              familyId: fixedExpense.familyId,
              notificationType: NotificationType.FIXED_EXPENSE_DUE,
              title: "고정지출 납부일이 다가와요.",
              message: `${fixedExpense.title} 납부 예정일을 확인해 주세요.`,
              sourceType: "FIXED_EXPENSE",
              sourceId: fixedExpense.id,
              deepLink: `/fixed-expenses/${fixedExpense.id}`,
              dedupeKey: `FIXED_EXPENSE_DUE:${fixedExpense.id}:${occurrence.dateKey}:${reminder.daysBefore}:${member.userId}`,
              availableAt,
              payload: { dueDate: occurrence.dateKey, daysBefore: reminder.daysBefore },
            });
          }
        }
      }
    }

    return planned;
  }

  private async planFamilyEventStart(now: Date, horizonEnd: Date) {
    const events = await this.prisma.familyEvent.findMany({
      where: { deletedAt: null },
      include: {
        participants: { where: { deletedAt: null }, include: { familyMember: true } },
        family: { include: { members: { where: { deletedAt: null } } } },
      },
    });
    const planned: PlannedNotification[] = [];

    for (const event of events) {
      const timezone = event.timezone || "Asia/Seoul";
      const startKey = formatDateKey(event.startAt, timezone);
      const startParts = getZonedParts(event.startAt, timezone);
      const rule = this.toJsonObject(event.recurrenceRule);
      const occurrences = enumerateOccurrences({
        recurrenceType: event.recurrenceType,
        startDate: startKey,
        endDate: typeof rule.endDate === "string" ? rule.endDate : null,
        dueTime: `${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`,
        timezone,
        rangeStart: now,
        rangeEnd: horizonEnd,
        dayOfWeek: startParts.dayOfWeek,
        dayOfMonth: startParts.day,
        monthOfYear: startParts.month,
        dayOfYearMonth: startParts.day,
      });
      const targets = event.participants.length
        ? this.uniqueMembers(event.participants.map((participant) => participant.familyMember))
        : this.uniqueMembers(event.family.members);

      for (const occurrence of occurrences) {
        if (occurrence.startsAt < now) continue;
        for (const member of targets) {
          if (!member.userId) continue;
          planned.push({
            userId: member.userId,
            familyId: event.familyId,
            notificationType: NotificationType.FAMILY_EVENT_START,
            title: "가족 일정이 있어요.",
            message: `${event.title} 일정이 시작돼요.`,
            sourceType: "FAMILY_EVENT",
            sourceId: event.id,
            deepLink: `/events/${event.id}`,
            dedupeKey: `FAMILY_EVENT_START:${event.id}:${occurrence.startsAt.toISOString()}:${member.userId}`,
            availableAt: occurrence.startsAt,
            payload: { dateKey: occurrence.dateKey },
          });
        }
      }
    }

    return planned;
  }

  private async planHouseholdItemRunout(now: Date, horizonEnd: Date) {
    const items = await this.prisma.householdItem.findMany({
      where: { deletedAt: null, nextEstimatedRunOutAt: { gte: now, lt: horizonEnd } },
      include: { family: { include: { members: { where: { deletedAt: null } } } } },
    });
    const planned: PlannedNotification[] = [];

    for (const item of items) {
      for (const member of item.family.members) {
        if (!member.userId || !item.nextEstimatedRunOutAt) continue;
        planned.push({
          userId: member.userId,
          familyId: item.familyId,
          notificationType: NotificationType.HOUSEHOLD_ITEM_RUNOUT,
          title: "생필품이 떨어질 것 같아요.",
          message: `${item.name} 재고를 확인해 주세요.`,
          sourceType: "HOUSEHOLD_ITEM",
          sourceId: item.id,
          deepLink: `/household-items/${item.id}`,
          dedupeKey: `HOUSEHOLD_ITEM_RUNOUT:${item.id}:${item.nextEstimatedRunOutAt.toISOString()}:${member.userId}`,
          availableAt: item.nextEstimatedRunOutAt,
          payload: { itemName: item.name },
        });
      }
    }

    return planned;
  }

  private mapTodoScheduleType(scheduleType?: TodoScheduleType) {
    if (scheduleType === TodoScheduleType.ONCE) return RecurrenceType.ONCE;
    if (scheduleType === TodoScheduleType.WEEKLY) return RecurrenceType.WEEKLY;
    if (scheduleType === TodoScheduleType.MONTHLY) return RecurrenceType.MONTHLY;
    if (scheduleType === TodoScheduleType.INTERVAL_DAYS || scheduleType === TodoScheduleType.DAILY) return RecurrenceType.INTERVAL_DAYS;
    return null;
  }

  private parseDaysOfWeek(value: unknown, scheduleType: TodoScheduleType) {
    if (scheduleType !== TodoScheduleType.WEEKLY || !Array.isArray(value)) return null;
    return Array.from(new Set(value.map((day) => Number(day)))).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  }

  private todoDueTargets<T extends { id: string; userId: string | null; deletedAt?: Date | null }>(
    assignee: T | null,
    planner: T | null,
    creator: T | null,
    ownerAdmins: T[],
  ) {
    if (this.isActiveUserMember(assignee)) return [assignee];
    if (this.isActiveUserMember(planner)) return [planner];
    if (this.isActiveUserMember(creator)) return [creator];
    return this.uniqueMembers(ownerAdmins.filter((member) => this.isActiveUserMember(member)));
  }

  private isActiveUserMember<T extends { userId: string | null; deletedAt?: Date | null }>(member: T | null): member is T {
    return Boolean(member && !member.deletedAt && member.userId);
  }

  private uniqueMembers<T extends { id: string; userId: string | null; deletedAt?: Date | null }>(members: Array<T | null>) {
    const byId = new Map<string, T>();
    for (const member of members) {
      if (member && !member.deletedAt && !byId.has(member.id)) byId.set(member.id, member);
    }
    return [...byId.values()];
  }

  private toJsonObject(value: Prisma.JsonValue | null) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private utcDateToDateKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
}
