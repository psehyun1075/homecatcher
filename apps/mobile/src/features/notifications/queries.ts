import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getNotification, listNotifications, type NotificationsParams } from "../../api/notifications-api";

export const notificationKeys = {
  list: (familyId: string, filters?: Omit<NotificationsParams, "cursor" | "familyId">) => ["familyScope", familyId, "notifications", filters ?? {}] as const,
  unreadCount: (familyId: string) => ["familyScope", familyId, "notifications", "unread-count"] as const,
  detail: (familyId: string, notificationId: string) => ["familyScope", familyId, "notification", notificationId] as const,
};

export function useNotifications(familyId?: string | null, filters: Omit<NotificationsParams, "cursor" | "familyId"> = {}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(familyId ?? "none", filters),
    queryFn: ({ pageParam }) => listNotifications({ ...filters, familyId, cursor: pageParam, limit: filters.limit ?? 20 }),
    enabled: Boolean(familyId),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useNotification(familyId: string | null | undefined, notificationId: string) {
  return useQuery({
    queryKey: notificationKeys.detail(familyId ?? "none", notificationId),
    queryFn: () => getNotification(notificationId),
    enabled: Boolean(familyId && notificationId),
  });
}
