import { apiRequest } from "./client";
import type { AppNotification } from "../features/notifications/types";

export interface NotificationsParams {
  familyId?: string | null;
  notificationType?: string;
  unreadOnly?: boolean;
  cursor?: string | null;
  limit?: number;
}

export function listNotifications(params: NotificationsParams = {}) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  if (params.familyId) search.set("familyId", params.familyId);
  if (params.notificationType) search.set("notificationType", params.notificationType);
  if (params.unreadOnly) search.set("unreadOnly", "true");
  if (params.cursor) search.set("cursor", params.cursor);
  return apiRequest<{ notifications: AppNotification[]; nextCursor: string | null }>(`/notifications?${search.toString()}`);
}

export function getNotification(notificationId: string) {
  return apiRequest<{ notification: AppNotification }>(`/notifications/${notificationId}`);
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<{ notification: AppNotification }>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function readAllNotifications(familyId?: string | null) {
  return apiRequest<{ updatedCount: number }>("/notifications/read-all", {
    method: "POST",
    body: familyId ? { familyId } : {},
  });
}

export function archiveNotification(notificationId: string) {
  return apiRequest<{ notification: AppNotification }>(`/notifications/${notificationId}/archive`, {
    method: "PATCH",
  });
}
