import { useMutation } from "@tanstack/react-query";

import { createItemPurchase } from "../../api/household-items-api";
import type { CreatePurchaseInput } from "./types";

export function useCreateItemPurchase(itemId: string) {
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => createItemPurchase(itemId, input),
  });
}
