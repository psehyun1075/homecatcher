import { apiRequest } from "./client";
import type { AccountCategory, AccountEntry, CreateAccountEntryInput, MonthlySummary } from "../features/accountbook/types";

export function listAccountCategories(familyId: string) {
  return apiRequest<{ categories: AccountCategory[] }>(`/families/${familyId}/accountbook/categories`);
}

export function listAccountEntries(familyId: string, params: { month?: string; categoryId?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries({ page: 1, limit: 50, ...params }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return apiRequest<{ entries: AccountEntry[]; page: number; limit: number; total: number }>(`/families/${familyId}/accountbook/entries?${query.toString()}`);
}

export function createAccountEntry(familyId: string, input: CreateAccountEntryInput) {
  return apiRequest<{ accountEntry: AccountEntry }>(`/families/${familyId}/accountbook/entries`, {
    method: "POST",
    body: input,
  });
}

export function getMonthlySummary(familyId: string, month: string) {
  return apiRequest<MonthlySummary>(`/families/${familyId}/accountbook/monthly-summary?month=${month}`);
}
