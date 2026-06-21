import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { HomeScreen } from "../screens/home-screen";
import { colors } from "../theme/colors";
import { CalendarNavigator } from "./calendar-navigator";
import { HouseholdItemsNavigator } from "./household-items-navigator";
import { MyHomeNavigator } from "./my-home-navigator";
import { TodosNavigator } from "./todos-navigator";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "홈", tabBarLabel: "홈" }} />
      <Tab.Screen name="HouseholdItems" component={HouseholdItemsNavigator} options={{ headerShown: false, title: "생필품", tabBarLabel: "생필품" }} />
      <Tab.Screen name="Todos" component={TodosNavigator} options={{ headerShown: false, title: "할 일", tabBarLabel: "할 일" }} />
      <Tab.Screen name="Calendar" component={CalendarNavigator} options={{ headerShown: false, title: "캘린더", tabBarLabel: "캘린더" }} />
      <Tab.Screen name="MyHome" component={MyHomeNavigator} options={{ headerShown: false, title: "우리집", tabBarLabel: "우리집" }} />
    </Tab.Navigator>
  );
}
