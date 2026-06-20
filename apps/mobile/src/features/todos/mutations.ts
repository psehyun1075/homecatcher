import { useMutation } from "@tanstack/react-query";

import { createTodoCompletion } from "../../api/todos-api";
import type { CreateTodoCompletionInput } from "./types";

export function useCreateTodoCompletion(todoId: string) {
  return useMutation({
    mutationFn: (input: CreateTodoCompletionInput) => createTodoCompletion(todoId, input),
  });
}
