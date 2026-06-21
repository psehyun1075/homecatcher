export type ActivityType = "TODO_COMPLETED" | "HOUSEHOLD_ITEM_PURCHASED" | "FIXED_EXPENSE_PAID" | "FAMILY_EVENT_CREATED" | "HOME_MANUAL_CREATED" | "TEMPLATE_APPLIED";

export interface ActivityActor {
  memberId: string;
  displayName: string | null;
}

export interface Activity {
  id: string;
  activityType: ActivityType;
  title: string;
  message: string;
  actor: ActivityActor | null;
  sourceType: string | null;
  sourceId: string | null;
  deepLink: string | null;
  payload?: unknown;
  appreciationCount: number;
  appreciatedByMe: boolean;
  occurredAt: string;
  createdAt: string;
}

export interface Appreciation {
  id: string;
  activityId: string;
  fromMember: ActivityActor;
  toMember: ActivityActor;
  message: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface CreateAppreciationInput {
  message?: string;
}
