import { useQuery } from "@tanstack/react-query";

import { getHouseholdItem, getReorderPreview, listHouseholdItems, listItemPurchases } from "../../api/household-items-api";

export const householdItemKeys = {
  list: (familyId: string) => ["familyScope", familyId, "householdItems"] as const,
  detail: (familyId: string, itemId: string) => ["familyScope", familyId, "householdItem", itemId] as const,
  reorderPreview: (familyId: string, itemId: string) => ["familyScope", familyId, "householdItem", itemId, "reorderPreview"] as const,
  purchases: (familyId: string, itemId: string) => ["familyScope", familyId, "householdItem", itemId, "purchases"] as const,
};

export function useHouseholdItems(familyId?: string | null) {
  return useQuery({
    queryKey: householdItemKeys.list(familyId ?? "none"),
    queryFn: () => listHouseholdItems(familyId!),
    enabled: Boolean(familyId),
  });
}

export function useHouseholdItem(familyId: string | undefined | null, itemId: string) {
  return useQuery({
    queryKey: householdItemKeys.detail(familyId ?? "none", itemId),
    queryFn: () => getHouseholdItem(itemId),
    enabled: Boolean(familyId && itemId),
  });
}

export function useReorderPreview(familyId: string | undefined | null, itemId: string) {
  return useQuery({
    queryKey: householdItemKeys.reorderPreview(familyId ?? "none", itemId),
    queryFn: () => getReorderPreview(itemId),
    enabled: Boolean(familyId && itemId),
  });
}

export function useItemPurchases(familyId: string | undefined | null, itemId: string) {
  return useQuery({
    queryKey: householdItemKeys.purchases(familyId ?? "none", itemId),
    queryFn: () => listItemPurchases(itemId),
    enabled: Boolean(familyId && itemId),
  });
}
