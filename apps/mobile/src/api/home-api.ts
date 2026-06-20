import { apiRequest } from "./client";
import type { CalendarDay } from "./types";

export function getUnreadCount(familyId: string) {
  return apiRequest<{ unreadCount: number }>(`/notifications/unread-count?familyId=${familyId}`);
}

export function getCalendarDay(familyId: string, date: string, timezone = "Asia/Seoul") {
  return apiRequest<CalendarDay>(`/families/${familyId}/calendar/day?date=${date}&timezone=${encodeURIComponent(timezone)}`);
}
