import { useQuery } from "@tanstack/react-query";

import { getFixedExpense, listFixedExpensePayments, listFixedExpenses } from "../../api/fixed-expenses-api";

export const fixedExpenseKeys = {
  list: (familyId: string) => ["familyScope", familyId, "fixedExpenses"] as const,
  detail: (familyId: string, fixedExpenseId: string) => ["familyScope", familyId, "fixedExpense", fixedExpenseId] as const,
  payments: (familyId: string, fixedExpenseId: string) => ["familyScope", familyId, "fixedExpense", fixedExpenseId, "payments"] as const,
};

export function useFixedExpenses(familyId?: string | null) {
  return useQuery({
    queryKey: fixedExpenseKeys.list(familyId ?? "none"),
    queryFn: () => listFixedExpenses(familyId!),
    enabled: Boolean(familyId),
  });
}

export function useFixedExpense(familyId: string | null | undefined, fixedExpenseId: string) {
  return useQuery({
    queryKey: fixedExpenseKeys.detail(familyId ?? "none", fixedExpenseId),
    queryFn: () => getFixedExpense(fixedExpenseId),
    enabled: Boolean(familyId && fixedExpenseId),
  });
}

export function useFixedExpensePayments(familyId: string | null | undefined, fixedExpenseId: string) {
  return useQuery({
    queryKey: fixedExpenseKeys.payments(familyId ?? "none", fixedExpenseId),
    queryFn: () => listFixedExpensePayments(fixedExpenseId),
    enabled: Boolean(familyId && fixedExpenseId),
  });
}
