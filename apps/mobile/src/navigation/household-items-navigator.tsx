import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HouseholdItemDetailScreen } from "../screens/household-items/household-item-detail-screen";
import { HouseholdItemListScreen } from "../screens/household-items/household-item-list-screen";
import { PurchaseConfirmScreen } from "../screens/household-items/purchase-confirm-screen";
import { ReorderPreviewScreen } from "../screens/household-items/reorder-preview-screen";
import { colors } from "../theme/colors";
import type { HouseholdItemsStackParamList } from "./types";

const Stack = createNativeStackNavigator<HouseholdItemsStackParamList>();

export function HouseholdItemsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Stack.Screen name="HouseholdItemList" component={HouseholdItemListScreen} options={{ title: "생필품" }} />
      <Stack.Screen name="HouseholdItemDetail" component={HouseholdItemDetailScreen} options={{ title: "생필품 상세" }} />
      <Stack.Screen name="ReorderPreview" component={ReorderPreviewScreen} options={{ title: "재주문 확인" }} />
      <Stack.Screen name="PurchaseConfirm" component={PurchaseConfirmScreen} options={{ title: "주문 완료 기록" }} />
    </Stack.Navigator>
  );
}
