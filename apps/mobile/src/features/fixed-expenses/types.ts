export interface FixedExpenseReminder {
  id: string;
  fixedExpenseId: string;
  daysBefore: number;
  remindTime: string;
  enabled: boolean;
}

export interface FixedExpense {
  id: string;
  familyId: string;
  title: string;
  amount: number | string;
  currency: string;
  categoryId: string | null;
  recurrenceType: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  intervalValue: number | null;
  startDate: string;
  endDate: string | null;
  dueTime: string;
  timezone: string;
  memo: string | null;
  isActive: boolean;
  status: string;
  reminders: FixedExpenseReminder[];
}

export interface FixedExpensePayment {
  id: string;
  requestId: string;
  fixedExpenseId: string;
  familyId: string;
  dueDate: string;
  paidAt: string;
  amount: number | string;
  currency: string;
  note: string | null;
  accountEntryId: string;
}

export interface CreateFixedExpensePaymentInput {
  requestId: string;
  dueDate: string;
  paidAt?: string;
  amount: number;
  currency?: string;
  note?: string | null;
}

export type FixedExpenseRecurrenceType = "ONCE" | "WEEKLY" | "MONTHLY" | "YEARLY" | "INTERVAL_DAYS";

export interface CreateFixedExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  recurrenceType: FixedExpenseRecurrenceType;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  intervalValue?: number | null;
  startDate: string;
  endDate?: string | null;
  dueTime?: string;
  timezone?: string;
  memo?: string | null;
  reminders?: Array<{
    daysBefore: number;
    remindTime: string;
    enabled: boolean;
  }>;
}
