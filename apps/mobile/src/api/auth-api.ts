import { apiRequest } from "./client";
import type { AuthResponse, User } from "./types";

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
    skipAuthRefresh: true,
  });
}

export function signup(name: string, email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: { name, email, password },
    token: null,
    skipAuthRefresh: true,
  });
}

export function me() {
  return apiRequest<{ user: User }>("/auth/me");
}

export function loginRefresh(refreshToken: string) {
  return apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    token: null,
    skipAuthRefresh: true,
  });
}

export function logout() {
  return apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
}
