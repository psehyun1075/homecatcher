import { clearStoredSession, loadStoredSession, saveStoredSession } from "../auth/session-storage";
import { clearSelectedFamilyId } from "../family/family-storage";
import type { AuthResponse } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  token?: string | null;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
}

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;
let sessionStorageWarningHandler: (() => void) | null = null;

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? null;
}

export function hasApiBaseUrl() {
  return Boolean(getApiBaseUrl());
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function setSessionStorageWarningHandler(handler: (() => void) | null) {
  sessionStorageWarningHandler = handler;
}

export function setTokens(accessToken: string | null, refreshToken: string | null) {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken;
}

export function getAccessToken() {
  return accessTokenMemory;
}

export async function restoreTokensFromStorage() {
  const stored = await loadStoredSession();
  setTokens(stored.accessToken, stored.refreshToken);
  return stored;
}

export async function persistTokens(accessToken: string, refreshToken: string) {
  setTokens(accessToken, refreshToken);
  const saved = await saveStoredSession({ accessToken, refreshToken });
  if (!saved) {
    sessionStorageWarningHandler?.();
  }
  return saved;
}

export async function clearClientSession() {
  setTokens(null, null);
  await Promise.allSettled([clearStoredSession(), clearSelectedFamilyId()]);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError("EXPO_PUBLIC_API_BASE_URL 환경변수를 설정해 주세요.");
  }

  const token = options.token === undefined ? accessTokenMemory : options.token;
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 401 && !options.skipAuthRefresh && refreshTokenMemory) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiRequest<T>(path, { ...options, token: refreshedToken, skipAuthRefresh: true });
    }
  }

  return parseResponse<T>(response);
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = refreshTokenMemory;
        if (!refreshToken) return null;
        const data = await apiRequest<AuthResponse>("/auth/refresh", {
          method: "POST",
          body: { refreshToken },
          token: null,
          skipAuthRefresh: true,
        });
        await persistTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        await clearClientSession();
        unauthorizedHandler?.();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new ApiError("잠시 연결이 어려워요.");
    }
    throw new ApiError("인터넷 연결을 확인해 주세요.");
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new ApiError(extractMessage(data) ?? "다시 불러올게요.", response.status);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function extractMessage(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return null;
}
