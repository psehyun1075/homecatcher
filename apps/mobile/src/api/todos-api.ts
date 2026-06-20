import { apiRequest } from "./client";
import type { CreateTodoCompletionInput, ListTodosParams, Todo, TodoCompletion } from "../features/todos/types";

function toQuery(params: ListTodosParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  return search.toString();
}

export function listTodos(familyId: string, params: ListTodosParams = {}) {
  const query = toQuery({ page: 1, limit: 50, ...params });
  return apiRequest<{ todos: Todo[]; page: number; limit: number; total: number }>(`/families/${familyId}/todos?${query}`);
}

export function getTodo(todoId: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${todoId}`);
}

export function listTodoCompletions(todoId: string) {
  return apiRequest<{ completions: TodoCompletion[] }>(`/todos/${todoId}/completions`);
}

export function createTodoCompletion(todoId: string, input: CreateTodoCompletionInput) {
  return apiRequest<{ completion: TodoCompletion; idempotent: boolean }>(`/todos/${todoId}/completions`, {
    method: "POST",
    body: input,
  });
}
