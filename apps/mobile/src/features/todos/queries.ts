import { useQuery } from "@tanstack/react-query";

import { getTodo, listTodoCompletions, listTodos } from "../../api/todos-api";
import type { ListTodosParams } from "./types";

export const todoKeys = {
  list: (familyId: string, params: ListTodosParams) => ["familyScope", familyId, "todos", params] as const,
  detail: (familyId: string, todoId: string) => ["familyScope", familyId, "todo", todoId] as const,
  completions: (familyId: string, todoId: string) => ["familyScope", familyId, "todo", todoId, "completions"] as const,
};

export function useTodos(familyId?: string | null, params: ListTodosParams = {}) {
  return useQuery({
    queryKey: todoKeys.list(familyId ?? "none", params),
    queryFn: () => listTodos(familyId!, params),
    enabled: Boolean(familyId),
  });
}

export function useTodo(familyId: string | undefined | null, todoId: string) {
  return useQuery({
    queryKey: todoKeys.detail(familyId ?? "none", todoId),
    queryFn: () => getTodo(todoId),
    enabled: Boolean(familyId && todoId),
  });
}

export function useTodoCompletions(familyId: string | undefined | null, todoId: string) {
  return useQuery({
    queryKey: todoKeys.completions(familyId ?? "none", todoId),
    queryFn: () => listTodoCompletions(todoId),
    enabled: Boolean(familyId && todoId),
  });
}
