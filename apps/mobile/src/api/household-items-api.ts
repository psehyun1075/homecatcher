import { apiRequest } from "./client";
import type { CreatePurchaseInput, HouseholdItem, ItemPurchase, ReorderPreview } from "../features/household-items/types";

export function listHouseholdItems(familyId: string) {
  return apiRequest<{ householdItems: HouseholdItem[] }>(`/families/${familyId}/household-items`);
}

export function getHouseholdItem(itemId: string) {
  return apiRequest<{ householdItem: HouseholdItem }>(`/household-items/${itemId}`);
}

export function getReorderPreview(itemId: string) {
  return apiRequest<{ reorderPreview: ReorderPreview }>(`/household-items/${itemId}/reorder-preview`);
}

export function listItemPurchases(itemId: string) {
  return apiRequest<{ purchases: ItemPurchase[] }>(`/household-items/${itemId}/purchases`);
}

export function createItemPurchase(itemId: string, input: CreatePurchaseInput) {
  return apiRequest<{ purchase: ItemPurchase; idempotent: boolean }>(`/household-items/${itemId}/purchases`, {
    method: "POST",
    body: input,
  });
}
