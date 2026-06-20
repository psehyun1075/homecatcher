import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { FamilyCreateScreen } from "../screens/family-create-screen";
import { FamilySelectScreen } from "../screens/family-select-screen";
import { FamilyStartScreen } from "../screens/family-start-screen";
import { InviteJoinScreen } from "../screens/invite-join-screen";
import { TemplateDetailScreen } from "../screens/template-detail-screen";
import { TemplateSelectScreen } from "../screens/template-select-screen";
import { colors } from "../theme/colors";
import type { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function FamilyOnboardingNavigator({ initialRouteName = "FamilyStart" }: { initialRouteName?: "FamilyStart" | "FamilySelect" }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="FamilyStart" component={FamilyStartScreen} options={{ title: "우리집 시작" }} />
      <Stack.Screen name="FamilyCreate" component={FamilyCreateScreen} options={{ title: "우리집 만들기" }} />
      <Stack.Screen name="InviteJoin" component={InviteJoinScreen} options={{ title: "초대 참여" }} />
      <Stack.Screen name="FamilySelect" component={FamilySelectScreen} options={{ title: "우리집 선택" }} />
    </Stack.Navigator>
  );
}

export function TemplateOnboardingNavigator({ familyId }: { familyId: string }) {
  return (
    <Stack.Navigator
      initialRouteName="TemplateSelect"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="TemplateSelect" component={TemplateSelectScreen} initialParams={{ familyId, canSkip: true }} options={{ title: "빠른 시작" }} />
      <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} options={{ title: "템플릿 살펴보기" }} />
    </Stack.Navigator>
  );
}
