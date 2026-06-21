import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CalendarDayScreen } from "../screens/calendar/calendar-day-screen";
import { CalendarMonthScreen } from "../screens/calendar/calendar-month-screen";
import { FamilyEventCreateScreen } from "../screens/calendar/family-event-create-screen";
import { FamilyEventDetailScreen } from "../screens/calendar/family-event-detail-screen";
import { colors } from "../theme/colors";
import type { CalendarStackParamList } from "./types";

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="CalendarMonth" component={CalendarMonthScreen} options={{ title: "가족 캘린더" }} />
      <Stack.Screen name="CalendarDay" component={CalendarDayScreen} options={{ title: "하루 보기" }} />
      <Stack.Screen name="FamilyEventDetail" component={FamilyEventDetailScreen} options={{ title: "가족 일정" }} />
      <Stack.Screen name="FamilyEventCreate" component={FamilyEventCreateScreen} options={{ title: "일정 추가" }} />
    </Stack.Navigator>
  );
}
