import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
}

const accessTokenKey = "homecatcher.accessToken";
const refreshTokenKey = "homecatcher.refreshToken";

const webStorage = {
  getItem(key: string) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

async function getValue(key: string) {
  try {
    if (Platform.OS === "web") return webStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setValue(key: string, value: string) {
  try {
    if (Platform.OS === "web") {
      webStorage.setItem(key, value);
      return true;
    }
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    return false;
  }
}

async function removeValue(key: string) {
  try {
    if (Platform.OS === "web") {
      webStorage.removeItem(key);
      return true;
    }
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch {
    return false;
  }
}

export async function loadStoredSession(): Promise<StoredSession> {
  const [accessToken, refreshToken] = await Promise.all([getValue(accessTokenKey), getValue(refreshTokenKey)]);
  return { accessToken, refreshToken };
}

export async function saveStoredSession(session: StoredSession) {
  const results = await Promise.all([
    session.accessToken ? setValue(accessTokenKey, session.accessToken) : Promise.resolve(true),
    session.refreshToken ? setValue(refreshTokenKey, session.refreshToken) : Promise.resolve(true),
  ]);
  return results.every(Boolean);
}

export async function clearStoredSession() {
  const results = await Promise.all([removeValue(accessTokenKey), removeValue(refreshTokenKey)]);
  return results.every(Boolean);
}
