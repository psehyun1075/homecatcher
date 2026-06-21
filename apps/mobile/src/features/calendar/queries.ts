import { useQuery } from "@tanstack/react-query";

import { getCalendarDay, getCalendarMonth } from "../../api/calendar-api";
import { getFamilyEvent } from "../../api/family-events-api";

export const calendarKeys = {
  month: (familyId: string, month: string, timezone: string) => ["familyScope", familyId, "calendar", "month", month, timezone] as const,
  day: (familyId: string, date: string, timezone: string) => ["familyScope", familyId, "calendar", "day", date, timezone] as const,
  event: (familyId: string, eventId: string) => ["familyScope", familyId, "events", eventId] as const,
};

export function useCalendarMonth(familyId: string | null | undefined, month: string, timezone = "Asia/Seoul") {
  return useQuery({
    queryKey: calendarKeys.month(familyId ?? "none", month, timezone),
    queryFn: () => getCalendarMonth(familyId!, month, timezone),
    enabled: Boolean(familyId),
  });
}

export function useCalendarDay(familyId: string | null | undefined, date: string, timezone = "Asia/Seoul") {
  return useQuery({
    queryKey: calendarKeys.day(familyId ?? "none", date, timezone),
    queryFn: () => getCalendarDay(familyId!, date, timezone),
    enabled: Boolean(familyId),
  });
}

export function useFamilyEvent(familyId: string | null | undefined, eventId: string) {
  return useQuery({
    queryKey: calendarKeys.event(familyId ?? "none", eventId),
    queryFn: () => getFamilyEvent(eventId),
    enabled: Boolean(familyId && eventId),
  });
}
