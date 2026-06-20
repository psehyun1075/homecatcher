import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const selectedFamilyKey = "homecatcher.selectedFamilyId";

export async function loadSelectedFamilyId() {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(selectedFamilyKey);
    }
    return await SecureStore.getItemAsync(selectedFamilyKey);
  } catch {
    return null;
  }
}

export async function saveSelectedFamilyId(familyId: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(selectedFamilyKey, familyId);
      return true;
    }
    await SecureStore.setItemAsync(selectedFamilyKey, familyId);
    return true;
  } catch {
    return false;
  }
}

export async function clearSelectedFamilyId() {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(selectedFamilyKey);
      return true;
    }
    await SecureStore.deleteItemAsync(selectedFamilyKey);
    return true;
  } catch {
    return false;
  }
}
