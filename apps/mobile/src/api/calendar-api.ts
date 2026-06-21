import { apiRequest } from "./client";
import type { CalendarDayResponse, CalendarMonth } from "../features/calendar/types";

export function getCalendarMonth(familyId: string, month: string, timezone = "Asia/Seoul") {
  return apiRequest<CalendarMonth>(`/families/${familyId}/calendar/month?month=${month}&timezone=${encodeURIComponent(timezone)}`);
}

export function getCalendarDay(familyId: string, date: string, timezone = "Asia/Seoul") {
  return apiRequest<CalendarDayResponse>(`/families/${familyId}/calendar/day?date=${date}&timezone=${encodeURIComponent(timezone)}`);
}
