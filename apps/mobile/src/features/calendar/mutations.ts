import { useMutation } from "@tanstack/react-query";

import { createFamilyEvent } from "../../api/family-events-api";
import type { CreateFamilyEventInput } from "./types";

export function useCreateFamilyEvent(familyId: string) {
  return useMutation({
    mutationFn: (input: CreateFamilyEventInput) => createFamilyEvent(familyId, input),
  });
}
