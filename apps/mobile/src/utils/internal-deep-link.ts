import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { MainTabParamList, MyHomeStackParamList } from "../navigation/types";

type MyHomeNavigation = NativeStackNavigationProp<MyHomeStackParamList>;
type TabNavigation = BottomTabNavigationProp<MainTabParamList>;

const uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export function openInternalDeepLink(deepLink: string | null | undefined, myHomeNavigation: MyHomeNavigation, tabNavigation?: TabNavigation) {
  if (!deepLink) return false;
  const path = deepLink.split("?")[0];

  const activityId = matchId(path, "activities");
  if (activityId) {
    myHomeNavigation.navigate("ActivityDetail", { activityId });
    return true;
  }

  const todoId = matchId(path, "todos");
  if (todoId) {
    tabNavigation?.navigate("Todos", { screen: "TodoDetail", params: { todoId } });
    return Boolean(tabNavigation);
  }

  const itemId = matchId(path, "household-items");
  if (itemId) {
    tabNavigation?.navigate("HouseholdItems", { screen: "HouseholdItemDetail", params: { itemId } });
    return Boolean(tabNavigation);
  }

  const fixedExpenseId = matchId(path, "fixed-expenses");
  if (fixedExpenseId) {
    myHomeNavigation.navigate("FixedExpenseDetail", { fixedExpenseId });
    return true;
  }

  const eventId = matchId(path, "events");
  if (eventId) {
    tabNavigation?.navigate("Calendar", { screen: "FamilyEventDetail", params: { eventId } });
    return Boolean(tabNavigation);
  }

  return false;
}

function matchId(path: string, segment: string) {
  const match = new RegExp(`^/${segment}/(${uuidPattern})$`).exec(path);
  return match?.[1] ?? null;
}
