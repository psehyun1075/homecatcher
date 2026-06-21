import { apiRequest } from "./client";
import type { CreateFixedExpenseInput, CreateFixedExpensePaymentInput, FixedExpense, FixedExpensePayment } from "../features/fixed-expenses/types";

export function listFixedExpenses(familyId: string) {
  return apiRequest<{ fixedExpenses: FixedExpense[]; page: number; limit: number; total: number }>(`/families/${familyId}/fixed-expenses?limit=50`);
}

export function getFixedExpense(fixedExpenseId: string) {
  return apiRequest<{ fixedExpense: FixedExpense }>(`/fixed-expenses/${fixedExpenseId}`);
}

export function createFixedExpense(familyId: string, input: CreateFixedExpenseInput) {
  return apiRequest<{ fixedExpense: FixedExpense }>(`/families/${familyId}/fixed-expenses`, {
    method: "POST",
    body: input,
  });
}

export function listFixedExpensePayments(fixedExpenseId: string) {
  return apiRequest<{ payments: FixedExpensePayment[] }>(`/fixed-expenses/${fixedExpenseId}/payments`);
}

export function createFixedExpensePayment(fixedExpenseId: string, input: CreateFixedExpensePaymentInput) {
  return apiRequest<{ payment: FixedExpensePayment; idempotent: boolean }>(`/fixed-expenses/${fixedExpenseId}/payments`, {
    method: "POST",
    body: input,
  });
}
