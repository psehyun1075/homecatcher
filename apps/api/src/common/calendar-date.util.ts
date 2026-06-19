import { BadRequestException } from "@nestjs/common";
import { RecurrenceType } from "@prisma/client";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  dayOfWeek: number;
}

export interface Occurrence {
  dateKey: string;
  startsAt: Date;
}

export function assertValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new BadRequestException("시간대를 다시 확인해 주세요.");
  }
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  assertValidTimezone(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });

  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: date.getUTCMilliseconds(),
    dayOfWeek: weekdayMap[values.weekday] ?? 0,
  };
}

export function formatDateKey(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function zonedTimeToUtc(
  local: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number },
  timezone: string,
) {
  assertValidTimezone(timezone);
  const hour = local.hour ?? 0;
  const minute = local.minute ?? 0;
  const second = local.second ?? 0;
  const millisecond = local.millisecond ?? 0;
  let utc = new Date(Date.UTC(local.year, local.month - 1, local.day, hour, minute, second, millisecond));

  for (let index = 0; index < 3; index += 1) {
    const parts = getZonedParts(utc, timezone);
    const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
    const target = Date.UTC(local.year, local.month - 1, local.day, hour, minute, second, millisecond);
    const diff = asIfUtc - target;

    if (diff === 0) {
      break;
    }

    utc = new Date(utc.getTime() - diff);
  }

  return utc;
}

export function localDateTimeToUtc(dateKey: string, time: string | null | undefined, timezone: string) {
  assertValidDateKey(dateKey);
  const { year, month, day } = parseDateKey(dateKey);
  const { hour, minute } = parseTime(time ?? "00:00");

  return zonedTimeToUtc({ year, month, day, hour, minute }, timezone);
}

export function monthRangeUtc(month: string, timezone: string) {
  assertValidMonth(month);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const start = zonedTimeToUtc({ year, month: monthNumber, day: 1 }, timezone);
  const endMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const endYear = monthNumber === 12 ? year + 1 : year;
  const end = zonedTimeToUtc({ year: endYear, month: endMonth, day: 1 }, timezone);

  return { start, end };
}

export function dayRangeUtc(dateKey: string, timezone: string) {
  assertValidDateKey(dateKey);
  const startParts = parseDateKey(dateKey);
  const start = zonedTimeToUtc(startParts, timezone);
  const next = addLocalDays(start, 1, timezone);

  return { start, end: next };
}

export function addLocalDays(date: Date, days: number, timezone: string) {
  const parts = getZonedParts(date, timezone);
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return zonedTimeToUtc(
    {
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
      millisecond: parts.millisecond,
    },
    timezone,
  );
}

export function enumerateDateKeys(startDateKey: string, endDateKey: string) {
  assertValidDateKey(startDateKey);
  assertValidDateKey(endDateKey);
  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);
  const keys: string[] = [];
  let cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const endDate = new Date(Date.UTC(end.year, end.month - 1, end.day));

  while (cursor <= endDate) {
    keys.push(`${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}-${pad2(cursor.getUTCDate())}`);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }

  return keys;
}

export function enumerateOccurrences(options: {
  recurrenceType: RecurrenceType;
  startDate: string;
  endDate?: string | null;
  dueTime?: string | null;
  timezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  daysOfWeek?: number[] | null;
  intervalValue?: number | null;
  monthOfYear?: number | null;
  dayOfYearMonth?: number | null;
}) {
  assertValidTimezone(options.timezone);
  assertValidDateKey(options.startDate);
  if (options.endDate) {
    assertValidDateKey(options.endDate);
  }
  const occurrences: Occurrence[] = [];
  const startDate = parseDateKey(options.startDate);
  const endLimit = options.endDate ? parseDateKey(options.endDate) : null;
  const rangeStartKey = formatDateKey(options.rangeStart, options.timezone);
  const rangeEndKey = formatDateKey(addLocalDays(options.rangeEnd, -1, options.timezone), options.timezone);
  const from = maxDateKey(options.startDate, rangeStartKey);
  const to = endLimit ? minDateKey(datePartsToKey(endLimit), rangeEndKey) : rangeEndKey;

  if (from > to) {
    return occurrences;
  }

  if (options.recurrenceType === RecurrenceType.ONCE) {
    if (options.startDate >= from && options.startDate <= to) {
      occurrences.push({ dateKey: options.startDate, startsAt: localDateTimeToUtc(options.startDate, options.dueTime, options.timezone) });
    }

    return occurrences;
  }

  if (options.recurrenceType === RecurrenceType.INTERVAL_DAYS) {
    const interval = options.intervalValue ?? 1;
    let cursor = datePartsToDate(startDate);

    while (dateToKey(cursor) < from) {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + interval));
    }

    while (dateToKey(cursor) <= to) {
      const dateKey = dateToKey(cursor);
      occurrences.push({ dateKey, startsAt: localDateTimeToUtc(dateKey, options.dueTime, options.timezone) });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + interval));
    }

    return occurrences;
  }

  let cursor = datePartsToDate(parseDateKey(from));
  const endCursor = datePartsToDate(parseDateKey(to));

  while (cursor <= endCursor) {
    const dateKey = dateToKey(cursor);
    const dayOfWeek = cursor.getUTCDay();
    const day = cursor.getUTCDate();
    const month = cursor.getUTCMonth() + 1;
    const lastDay = lastDayOfMonth(cursor.getUTCFullYear(), month);
    let matches = false;

    if (options.recurrenceType === RecurrenceType.WEEKLY) {
      const daysOfWeek = options.daysOfWeek ?? (options.dayOfWeek == null ? [] : [options.dayOfWeek]);
      matches = daysOfWeek.includes(dayOfWeek);
    } else if (options.recurrenceType === RecurrenceType.MONTHLY) {
      matches = day === Math.min(options.dayOfMonth ?? startDate.day, lastDay);
    } else if (options.recurrenceType === RecurrenceType.YEARLY) {
      const targetMonth = options.monthOfYear ?? startDate.month;
      const targetDay = Math.min(options.dayOfYearMonth ?? startDate.day, lastDayOfMonth(cursor.getUTCFullYear(), targetMonth));
      matches = month === targetMonth && day === targetDay;
    }

    if (matches) {
      occurrences.push({ dateKey, startsAt: localDateTimeToUtc(dateKey, options.dueTime, options.timezone) });
    }

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }

  return occurrences;
}

export function parseDateKey(dateKey: string) {
  const [yearText, monthText, dayText] = dateKey.split("-");

  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
  };
}

export function assertValidMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException("조회할 달을 확인해 주세요.");
  }

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new BadRequestException("조회할 달을 확인해 주세요.");
  }
}

export function assertValidDateKey(dateKey: string, message = "날짜를 확인해 주세요.") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new BadRequestException(message);
  }

  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!valid) {
    throw new BadRequestException(message);
  }
}

export function parseTime(time: string) {
  const [hourText, minuteText] = time.split(":");

  return {
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

export function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function datePartsToKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function maxDateKey(a: string, b: string) {
  return a > b ? a : b;
}

function minDateKey(a: string, b: string) {
  return a < b ? a : b;
}

function datePartsToDate(parts: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function dateToKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
