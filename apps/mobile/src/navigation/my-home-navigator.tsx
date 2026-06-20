import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeManualDetailScreen } from "../screens/home-manuals/home-manual-detail-screen";
import { HomeManualListScreen } from "../screens/home-manuals/home-manual-list-screen";
import { MyHomeScreen } from "../screens/my-home-screen";
import { colors } from "../theme/colors";
import type { MyHomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<MyHomeStackParamList>();

export function MyHomeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="MyHomeMain" component={MyHomeScreen} options={{ title: "우리집" }} />
      <Stack.Screen name="HomeManualList" component={HomeManualListScreen} options={{ title: "우리집 매뉴얼" }} />
      <Stack.Screen name="HomeManualDetail" component={HomeManualDetailScreen} options={{ title: "매뉴얼 상세" }} />
    </Stack.Navigator>
  );
}
