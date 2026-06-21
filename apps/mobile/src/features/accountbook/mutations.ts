import { useMutation } from "@tanstack/react-query";

import { createAccountEntry } from "../../api/accountbook-api";
import type { CreateAccountEntryInput } from "./types";

export function useCreateAccountEntry(familyId: string) {
  return useMutation({
    mutationFn: (input: CreateAccountEntryInput) => createAccountEntry(familyId, input),
  });
}
