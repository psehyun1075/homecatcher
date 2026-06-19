import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Prisma, RecurrenceType, TodoScheduleType } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import {
  addLocalDays,
  assertValidTimezone,
  dayRangeUtc,
  enumerateDateKeys,
  enumerateOccurrences,
  formatDateKey,
  getZonedParts,
  localDateTimeToUtc,
  monthRangeUtc,
} from "../common/calendar-date.util";
import { PrismaService } from "../prisma/prisma.service";
import { CalendarDayQueryDto } from "./dto/calendar-day-query.dto";
import { CalendarMonthQueryDto } from "./dto/calendar-month-query.dto";

type CalendarSourceType = "FAMILY_EVENT" | "TODO" | "FIXED_EXPENSE" | "HOUSEHOLD_ITEM";

export interface CalendarItem {
  sourceType: CalendarSourceType;
  sourceId: string;
  occurrenceKey: string;
  title: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  allDay?: boolean;
  amount?: number;
  currency?: string;
  status: "SCHEDULED" | "DUE" | "UPCOMING" | "OVERDUE" | "PAID";
  displayColor: string;
}

const DEFAULT_TYPES: CalendarSourceType[] = ["FAMILY_EVENT", "TODO", "FIXED_EXPENSE", "HOUSEHOLD_ITEM"];
const DEFAULT_COLORS: Record<CalendarSourceType, string> = {
  FAMILY_EVENT: "#67A57A",
  TODO: "#4F7CAC",
  FIXED_EXPENSE: "#D18B47",
  HOUSEHOLD_ITEM: "#8E6BBE",
};

@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getMonth(user: CurrentUserPayload, familyId: string, query: CalendarMonthQueryDto) {
    const timezone = query.timezone ?? "Asia/Seoul";
    assertValidTimezone(timezone);
    await this.ensureFamilyMember(user.userId, familyId);
    const types = this.parseTypes(query.types);
    const range = monthRangeUtc(query.month, timezone);
    const [yearText, monthText] = query.month.split("-");
    const nextMonth = Number(monthText) === 12 ? `${Number(yearText) + 1}-01` : `${yearText}-${String(Number(monthText) + 1).padStart(2, "0")}`;
    const startKey = `${query.month}-01`;
    const endKey = formatDateKey(addLocalDays(monthRangeUtc(nextMonth, timezone).start, -1, timezone), timezone);
    const days = this.buildDayMap(startKey, endKey);

    await this.fillItems(days, familyId, range.start, range.end, timezone, types);

    return {
      month: query.month,
      timezone,
      days: this.serializeDays(days),
    };
  }

  async getDay(user: CurrentUserPayload, familyId: string, query: CalendarDayQueryDto) {
    const timezone = query.timezone ?? "Asia/Seoul";
    assertValidTimezone(timezone);
    await this.ensureFamilyMember(user.userId, familyId);
    const types = this.parseTypes(query.types);
    const range = dayRangeUtc(query.date, timezone);
    const days = this.buildDayMap(query.date, query.date);

    await this.fillItems(days, familyId, range.start, range.end, timezone, types);

    return {
      date: query.date,
      timezone,
      day: this.serializeDays(days)[0],
    };
  }

  private async fillItems(
    days: Map<string, CalendarItem[]>,
    familyId: string,
    rangeStart: Date,
    rangeEnd: Date,
    timezone: string,
    types: Set<CalendarSourceType>,
  ) {
    if (types.has("FAMILY_EVENT")) {
      await this.addFamilyEvents(days, familyId, rangeStart, rangeEnd, timezone);
    }

    if (types.has("TODO")) {
      await this.addTodos(days, familyId, rangeStart, rangeEnd, timezone);
    }

    if (types.has("FIXED_EXPENSE")) {
      await this.addFixedExpenses(days, familyId, rangeStart, rangeEnd, timezone);
    }

    if (types.has("HOUSEHOLD_ITEM")) {
      await this.addHouseholdItems(days, familyId, rangeStart, rangeEnd, timezone);
    }
  }

  private async addFamilyEvents(days: Map<string, CalendarItem[]>, familyId: string, rangeStart: Date, rangeEnd: Date, timezone: string) {
    const events = await this.prisma.familyEvent.findMany({
      where: {
        familyId,
        deletedAt: null,
        OR: [{ startAt: { lt: rangeEnd } }, { recurrenceType: { not: RecurrenceType.ONCE } }],
      },
      orderBy: [{ startAt: "asc" }],
    });

    for (const event of events) {
      const eventTimezone = event.timezone || timezone;
      assertValidTimezone(eventTimezone);
      const startKey = formatDateKey(event.startAt, eventTimezone);
      const startParts = getZonedParts(event.startAt, eventTimezone);
      const endAt = event.endAt ?? event.startAt;
      const durationMs = Math.max(0, endAt.getTime() - event.startAt.getTime());
      const recurrenceRule = this.toJsonObject(event.recurrenceRule);
      const recurrenceEndDate = typeof recurrenceRule.endDate === "string" ? recurrenceRule.endDate : null;
      const occurrences =
        event.recurrenceType === RecurrenceType.ONCE
          ? [{ dateKey: startKey, startsAt: event.startAt }]
          : enumerateOccurrences({
              recurrenceType: event.recurrenceType,
              startDate: startKey,
              endDate: recurrenceEndDate,
              dueTime: `${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`,
              timezone: eventTimezone,
              rangeStart,
              rangeEnd,
              dayOfMonth: startParts.day,
              dayOfWeek: startParts.dayOfWeek,
              monthOfYear: startParts.month,
              dayOfYearMonth: startParts.day,
            });

      for (const occurrence of occurrences) {
        const occurrenceEnd = new Date(occurrence.startsAt.getTime() + durationMs);
        this.addMultiDayItem(days, occurrence.startsAt, occurrenceEnd, eventTimezone, {
          sourceType: "FAMILY_EVENT",
          sourceId: event.id,
          occurrenceKey: this.occurrenceKey("FAMILY_EVENT", event.id, occurrence.startsAt, occurrence.dateKey, eventTimezone),
          title: event.title,
          startsAt: occurrence.startsAt,
          endsAt: occurrenceEnd,
          allDay: event.allDay,
          status: "SCHEDULED",
          displayColor: event.displayColor ?? DEFAULT_COLORS.FAMILY_EVENT,
        });
      }
    }
  }

  private async addTodos(days: Map<string, CalendarItem[]>, familyId: string, rangeStart: Date, rangeEnd: Date, timezone: string) {
    const todos = await this.prisma.todoTask.findMany({
      where: {
        familyId,
        deletedAt: null,
        NOT: {
          AND: [{ completedAt: { not: null } }, { schedules: { some: { scheduleType: TodoScheduleType.ONCE, deletedAt: null } } }],
        },
        schedules: {
          some: {
            deletedAt: null,
            isEnabled: true,
          },
        },
      },
      include: {
        schedules: {
          where: {
            deletedAt: null,
            isEnabled: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    for (const todo of todos) {
      const schedule = todo.schedules[0];

      if (!schedule) {
        continue;
      }

      const payload = this.toJsonObject(schedule.repeatRule);
      const scheduleTimezone = schedule.timezone || timezone;
      const startAt = typeof payload.startAt === "string" ? new Date(payload.startAt) : schedule.nextDueAt ?? todo.createdAt;
      const startKey = formatDateKey(startAt, scheduleTimezone);
      const startParts = getZonedParts(startAt, scheduleTimezone);
      const recurrenceType = this.mapTodoScheduleType(schedule.scheduleType);

      if (!recurrenceType) {
        continue;
      }

      const occurrences = enumerateOccurrences({
        recurrenceType,
        startDate: startKey,
        endDate: typeof payload.endAt === "string" ? formatDateKey(new Date(payload.endAt), scheduleTimezone) : null,
        dueTime: `${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`,
        timezone: scheduleTimezone,
        rangeStart,
        rangeEnd,
        daysOfWeek: this.parseDaysOfWeek(payload.daysOfWeek, schedule.scheduleType),
        dayOfWeek: startParts.dayOfWeek,
        dayOfMonth: typeof payload.dayOfMonth === "number" ? payload.dayOfMonth : startParts.day,
        intervalValue: typeof payload.intervalValue === "number" ? payload.intervalValue : 1,
      });

      for (const occurrence of occurrences) {
        this.pushItem(days, occurrence.dateKey, {
          sourceType: "TODO",
          sourceId: todo.id,
          occurrenceKey: this.occurrenceKey("TODO", todo.id, occurrence.startsAt, occurrence.dateKey, scheduleTimezone),
          title: todo.title,
          startsAt: occurrence.startsAt,
          status: "DUE",
          displayColor: DEFAULT_COLORS.TODO,
        });
      }
    }
  }

  private async addFixedExpenses(days: Map<string, CalendarItem[]>, familyId: string, rangeStart: Date, rangeEnd: Date, timezone: string) {
    const fixedExpenses = await this.prisma.fixedExpense.findMany({
      where: {
        familyId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        payments: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
    const todayKey = formatDateKey(new Date(), timezone);

    for (const fixedExpense of fixedExpenses) {
      const startDate = this.utcDateToDateKey(fixedExpense.startDate ?? fixedExpense.createdAt);
      const fixedTimezone = fixedExpense.timezone || timezone;
      const startParts = getZonedParts(localDateTimeToUtc(startDate, fixedExpense.dueTime ?? "09:00", fixedTimezone), fixedTimezone);
      const paidDueDates = new Set(fixedExpense.payments.map((payment) => this.utcDateToDateKey(payment.dueDate)));
      const occurrences = enumerateOccurrences({
        recurrenceType: fixedExpense.recurrenceType,
        startDate,
        endDate: fixedExpense.endDate ? this.utcDateToDateKey(fixedExpense.endDate) : null,
        dueTime: fixedExpense.dueTime ?? "09:00",
        timezone: fixedTimezone,
        rangeStart,
        rangeEnd,
        dayOfMonth: fixedExpense.dayOfMonth ?? startParts.day,
        dayOfWeek: fixedExpense.dayOfWeek ?? startParts.dayOfWeek,
        intervalValue: fixedExpense.intervalValue ?? 1,
        monthOfYear: startParts.month,
        dayOfYearMonth: fixedExpense.dayOfMonth ?? startParts.day,
      });

      for (const occurrence of occurrences) {
        this.pushItem(days, occurrence.dateKey, {
          sourceType: "FIXED_EXPENSE",
          sourceId: fixedExpense.id,
          occurrenceKey: this.occurrenceKey("FIXED_EXPENSE", fixedExpense.id, occurrence.startsAt, occurrence.dateKey, fixedTimezone),
          title: fixedExpense.title,
          startsAt: occurrence.startsAt,
          amount: Number(fixedExpense.amount),
          currency: fixedExpense.currency,
          status: paidDueDates.has(occurrence.dateKey) ? "PAID" : this.fixedExpenseStatus(occurrence.dateKey, todayKey),
          displayColor: DEFAULT_COLORS.FIXED_EXPENSE,
        });
      }
    }
  }

  private async addHouseholdItems(days: Map<string, CalendarItem[]>, familyId: string, rangeStart: Date, rangeEnd: Date, timezone: string) {
    const items = await this.prisma.householdItem.findMany({
      where: {
        familyId,
        deletedAt: null,
        nextEstimatedRunOutAt: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
    });

    for (const item of items) {
      if (!item.nextEstimatedRunOutAt) {
        continue;
      }

      const dateKey = formatDateKey(item.nextEstimatedRunOutAt, timezone);
      this.pushItem(days, dateKey, {
        sourceType: "HOUSEHOLD_ITEM",
        sourceId: item.id,
        occurrenceKey: this.occurrenceKey("HOUSEHOLD_ITEM", item.id, item.nextEstimatedRunOutAt, dateKey, timezone),
        title: `${item.name} 소진 예상`,
        startsAt: item.nextEstimatedRunOutAt,
        status: "UPCOMING",
        displayColor: DEFAULT_COLORS.HOUSEHOLD_ITEM,
      });
    }
  }

  private addMultiDayItem(days: Map<string, CalendarItem[]>, startsAt: Date, endsAt: Date, timezone: string, item: CalendarItem) {
    const firstKey = formatDateKey(startsAt, timezone);
    const lastKey = formatDateKey(endsAt, timezone);

    for (const dateKey of enumerateDateKeys(firstKey, lastKey)) {
      this.pushItem(days, dateKey, {
        ...item,
        occurrenceKey: `${item.occurrenceKey}:${dateKey}`,
      });
    }
  }

  private pushItem(days: Map<string, CalendarItem[]>, dateKey: string, item: CalendarItem) {
    const items = days.get(dateKey);

    if (!items) {
      return;
    }

    if (items.some((existing) => existing.occurrenceKey === item.occurrenceKey)) {
      return;
    }

    items.push(item);
  }

  private serializeDays(days: Map<string, CalendarItem[]>) {
    return Array.from(days.entries()).map(([date, items]) => {
      const sortedItems = items.sort((a, b) => {
        const timeA = a.startsAt?.getTime() ?? 0;
        const timeB = b.startsAt?.getTime() ?? 0;

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return a.sourceType.localeCompare(b.sourceType);
      });

      return {
        date,
        itemCount: sortedItems.length,
        items: sortedItems,
      };
    });
  }

  private buildDayMap(startDateKey: string, endDateKey: string) {
    const days = new Map<string, CalendarItem[]>();

    for (const dateKey of enumerateDateKeys(startDateKey, endDateKey)) {
      days.set(dateKey, []);
    }

    return days;
  }

  private parseTypes(types?: string) {
    if (!types) {
      return new Set(DEFAULT_TYPES);
    }

    const parsed = types.split(",").map((type) => type.trim()).filter(Boolean);
    const allowed = new Set(DEFAULT_TYPES);

    for (const type of parsed) {
      if (!allowed.has(type as CalendarSourceType)) {
        throw new BadRequestException("캘린더 유형을 다시 확인해 주세요.");
      }
    }

    return new Set(parsed as CalendarSourceType[]);
  }

  private parseDaysOfWeek(value: unknown, scheduleType: TodoScheduleType) {
    if (scheduleType !== TodoScheduleType.WEEKLY) {
      return null;
    }

    if (!Array.isArray(value)) {
      return [];
    }

    const days = Array.from(new Set(value.map((day) => Number(day)))).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

    return days;
  }

  private occurrenceKey(sourceType: CalendarSourceType, sourceId: string, startsAt: Date, dateKey: string, timezone: string) {
    const parts = getZonedParts(startsAt, timezone);
    const localStart = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;

    return `${sourceType}:${sourceId}:${localStart}:${startsAt.toISOString()}:${dateKey}`;
  }

  private mapTodoScheduleType(scheduleType: TodoScheduleType) {
    if (scheduleType === TodoScheduleType.ONCE) {
      return RecurrenceType.ONCE;
    }

    if (scheduleType === TodoScheduleType.WEEKLY) {
      return RecurrenceType.WEEKLY;
    }

    if (scheduleType === TodoScheduleType.MONTHLY) {
      return RecurrenceType.MONTHLY;
    }

    if (scheduleType === TodoScheduleType.INTERVAL_DAYS || scheduleType === TodoScheduleType.DAILY) {
      return RecurrenceType.INTERVAL_DAYS;
    }

    return null;
  }

  private fixedExpenseStatus(dateKey: string, todayKey: string) {
    if (dateKey < todayKey) {
      return "OVERDUE" as const;
    }

    if (dateKey === todayKey) {
      return "DUE" as const;
    }

    return "UPCOMING" as const;
  }

  private toJsonObject(value: Prisma.JsonValue | null) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private async ensureFamilyMember(userId: string, familyId: string) {
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

  private utcDateToDateKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
}
