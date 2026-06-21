export type CalendarSourceType = "FAMILY_EVENT" | "TODO" | "FIXED_EXPENSE" | "HOUSEHOLD_ITEM";

export interface CalendarItem {
  sourceType: CalendarSourceType;
  sourceId: string;
  occurrenceKey: string;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  allDay?: boolean;
  amount?: number | string | null;
  currency?: string | null;
  status: "SCHEDULED" | "DUE" | "UPCOMING" | "OVERDUE" | "PAID";
  displayColor: string;
}

export interface CalendarDayBucket {
  date: string;
  itemCount: number;
  items: CalendarItem[];
}

export interface CalendarMonth {
  month: string;
  timezone: string;
  days: CalendarDayBucket[];
}

export interface CalendarDayResponse {
  date: string;
  timezone: string;
  day: CalendarDayBucket;
}

export interface FamilyEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  eventType: string;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  timezone: string;
  displayColor: string | null;
  recurrenceType: string;
}

export interface CreateFamilyEventInput {
  title: string;
  description?: string | null;
  eventType: string;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  timezone?: string;
  displayColor?: string | null;
  recurrenceType?: "ONCE";
  participantMemberIds?: string[];
}
