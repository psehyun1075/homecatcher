import { useQuery } from "@tanstack/react-query";

import { getMonthlySummary, listAccountCategories, listAccountEntries } from "../../api/accountbook-api";

export const accountbookKeys = {
  categories: (familyId: string) => ["familyScope", familyId, "accountbook", "categories"] as const,
  entries: (familyId: string, params: { month?: string; categoryId?: string; limit?: number }) => ["familyScope", familyId, "accountbook", "entries", params] as const,
  summary: (familyId: string, month: string) => ["familyScope", familyId, "accountbook", "summary", month] as const,
};

export function useAccountCategories(familyId?: string | null) {
  return useQuery({
    queryKey: accountbookKeys.categories(familyId ?? "none"),
    queryFn: () => listAccountCategories(familyId!),
    enabled: Boolean(familyId),
  });
}

export function useAccountEntries(familyId: string | null | undefined, params: { month?: string; categoryId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: accountbookKeys.entries(familyId ?? "none", params),
    queryFn: () => listAccountEntries(familyId!, params),
    enabled: Boolean(familyId),
  });
}

export function useMonthlySummary(familyId: string | null | undefined, month: string) {
  return useQuery({
    queryKey: accountbookKeys.summary(familyId ?? "none", month),
    queryFn: () => getMonthlySummary(familyId!, month),
    enabled: Boolean(familyId),
  });
}
