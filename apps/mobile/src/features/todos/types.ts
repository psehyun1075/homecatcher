export interface FamilyMemberSummary {
  id: string;
  familyId: string;
  userId: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  displayName: string | null;
}

export interface TodoSchedule {
  id: string;
  todoTaskId: string;
  scheduleType: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "INTERVAL_DAYS";
  intervalValue: number | null;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  nextDueAt: string | null;
  isEnabled: boolean;
}

export interface TodoCompletion {
  id: string;
  requestId: string;
  todoId: string;
  completedByMember: FamilyMemberSummary | null;
  completedAt: string;
  note: string | null;
}

export interface Todo {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: number | null;
  estimatedMinutes: number | null;
  isActive: boolean;
  completedAt: string | null;
  createdByMember: FamilyMemberSummary | null;
  plannerMember: FamilyMemberSummary | null;
  assigneeMember: FamilyMemberSummary | null;
  schedule: TodoSchedule | null;
  nextDueAt: string | null;
  latestCompletion: TodoCompletion | null;
  completionCount: number;
}

export interface ListTodosParams {
  dueFrom?: string;
  dueTo?: string;
  completed?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTodoCompletionInput {
  requestId: string;
  completedAt?: string;
  note?: string;
}
