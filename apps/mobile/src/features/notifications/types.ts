export type NotificationType =
  | "ACTIVITY"
  | "TODO_DUE"
  | "FIXED_EXPENSE_DUE"
  | "FAMILY_EVENT_START"
  | "HOUSEHOLD_ITEM_RUNOUT"
  | "APPRECIATION_RECEIVED";

export interface AppNotification {
  id: string;
  notificationType: NotificationType;
  status: string;
  title: string;
  message: string;
  familyId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  deepLink: string | null;
  availableAt: string;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}
