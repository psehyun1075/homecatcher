import { useMutation } from "@tanstack/react-query";

import { createFixedExpense, createFixedExpensePayment } from "../../api/fixed-expenses-api";
import type { CreateFixedExpenseInput, CreateFixedExpensePaymentInput } from "./types";

export function useCreateFixedExpense(familyId: string) {
  return useMutation({
    mutationFn: (input: CreateFixedExpenseInput) => createFixedExpense(familyId, input),
  });
}

export function useCreateFixedExpensePayment(fixedExpenseId: string) {
  return useMutation({
    mutationFn: (input: CreateFixedExpensePaymentInput) => createFixedExpensePayment(fixedExpenseId, input),
  });
}
