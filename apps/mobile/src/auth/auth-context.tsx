import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as AuthApi from "../api/auth-api";
import { clearClientSession, persistTokens, restoreTokensFromStorage, setSessionStorageWarningHandler, setUnauthorizedHandler } from "../api/client";
import type { User } from "../api/types";

const sessionStorageWarningMessage = "이 기기에는 로그인 정보를 저장하지 못했어요. 앱을 다시 열면 다시 로그인해야 할 수 있어요.";

interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  sessionStorageWarning: string | null;
  clearSessionStorageWarning: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [sessionStorageWarning, setSessionStorageWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const resetSession = useCallback(async () => {
    await clearClientSession();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void resetSession();
    });
    setSessionStorageWarningHandler(() => {
      setSessionStorageWarning(sessionStorageWarningMessage);
    });
    return () => {
      setUnauthorizedHandler(null);
      setSessionStorageWarningHandler(null);
    };
  }, [resetSession]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await restoreTokensFromStorage();
        if (!stored.refreshToken) return;
        const refreshed = await AuthApi.loginRefresh(stored.refreshToken);
        await persistTokens(refreshed.accessToken, refreshed.refreshToken);
        const me = await AuthApi.me();
        if (active) setUser(me.user);
      } catch {
        await clearClientSession();
      } finally {
        if (active) setIsBootstrapping(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await AuthApi.login(email, password);
    const saved = await persistTokens(response.accessToken, response.refreshToken);
    setSessionStorageWarning(saved ? null : sessionStorageWarningMessage);
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const response = await AuthApi.signup(name, email, password);
    const saved = await persistTokens(response.accessToken, response.refreshToken);
    setSessionStorageWarning(saved ? null : sessionStorageWarningMessage);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthApi.logout();
    } catch {
      // Local logout must succeed even when the server is unreachable.
    }
    await resetSession();
  }, [resetSession]);

  const refreshMe = useCallback(async () => {
    const response = await AuthApi.me();
    setUser(response.user);
  }, []);

  const clearSessionStorageWarning = useCallback(() => {
    setSessionStorageWarning(null);
  }, []);

  const value = useMemo(
    () => ({ user, isBootstrapping, sessionStorageWarning, clearSessionStorageWarning, signIn, signUp, signOut, refreshMe }),
    [clearSessionStorageWarning, isBootstrapping, refreshMe, sessionStorageWarning, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
