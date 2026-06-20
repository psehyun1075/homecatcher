import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { CalendarPlaceholderScreen } from "../screens/calendar-placeholder-screen";
import { HomeScreen } from "../screens/home-screen";
import { HouseholdItemsPlaceholderScreen } from "../screens/household-items-placeholder-screen";
import { MyHomeScreen } from "../screens/my-home-screen";
import { TodosPlaceholderScreen } from "../screens/todos-placeholder-screen";
import { colors } from "../theme/colors";
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
      <Tab.Screen name="HouseholdItems" component={HouseholdItemsPlaceholderScreen} options={{ title: "생필품", tabBarLabel: "생필품" }} />
      <Tab.Screen name="Todos" component={TodosPlaceholderScreen} options={{ title: "할 일", tabBarLabel: "할 일" }} />
      <Tab.Screen name="Calendar" component={CalendarPlaceholderScreen} options={{ title: "캘린더", tabBarLabel: "캘린더" }} />
      <Tab.Screen name="MyHome" component={MyHomeScreen} options={{ title: "우리집", tabBarLabel: "우리집" }} />
    </Tab.Navigator>
  );
}
