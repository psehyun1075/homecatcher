import { useMutation } from "@tanstack/react-query";

import { createAppreciation, deleteAppreciation } from "../../api/feed-api";
import type { CreateAppreciationInput } from "./types";

export function useCreateAppreciation(activityId: string) {
  return useMutation({
    mutationFn: (input: CreateAppreciationInput) => createAppreciation(activityId, input),
  });
}

export function useDeleteAppreciation() {
  return useMutation({
    mutationFn: (appreciationId: string) => deleteAppreciation(appreciationId),
  });
}
