import { useMutation } from "@tanstack/react-query";

import { archiveNotification, markNotificationRead, readAllNotifications } from "../../api/notifications-api";

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
  });
}

export function useReadAllNotifications() {
  return useMutation({
    mutationFn: (familyId?: string | null) => readAllNotifications(familyId),
  });
}

export function useArchiveNotification() {
  return useMutation({
    mutationFn: (notificationId: string) => archiveNotification(notificationId),
  });
}
