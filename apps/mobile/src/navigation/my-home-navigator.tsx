import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountbookEntriesScreen } from "../screens/accountbook/accountbook-entries-screen";
import { AccountbookEntryCreateScreen } from "../screens/accountbook/accountbook-entry-create-screen";
import { AccountbookHomeScreen } from "../screens/accountbook/accountbook-home-screen";
import { ActivityDetailScreen } from "../screens/feed/activity-detail-screen";
import { FamilyFeedScreen } from "../screens/feed/family-feed-screen";
import { FamilyInviteScreen } from "../screens/family-invite-screen";
import { FixedExpenseCreateScreen } from "../screens/fixed-expenses/fixed-expense-create-screen";
import { FixedExpenseDetailScreen } from "../screens/fixed-expenses/fixed-expense-detail-screen";
import { FixedExpenseListScreen } from "../screens/fixed-expenses/fixed-expense-list-screen";
import { FixedExpensePaymentScreen } from "../screens/fixed-expenses/fixed-expense-payment-screen";
import { HomeManualDetailScreen } from "../screens/home-manuals/home-manual-detail-screen";
import { HomeManualListScreen } from "../screens/home-manuals/home-manual-list-screen";
import { MyHomeScreen } from "../screens/my-home-screen";
import { NotificationDetailScreen } from "../screens/notifications/notification-detail-screen";
import { NotificationListScreen } from "../screens/notifications/notification-list-screen";
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
      <Stack.Screen name="FamilyFeed" component={FamilyFeedScreen} options={{ title: "우리집 소식" }} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: "소식 상세" }} />
      <Stack.Screen name="NotificationList" component={NotificationListScreen} options={{ title: "알림함" }} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} options={{ title: "알림 상세" }} />
      <Stack.Screen name="FamilyInvite" component={FamilyInviteScreen} options={{ title: "가족 초대하기" }} />
      <Stack.Screen name="HomeManualList" component={HomeManualListScreen} options={{ title: "우리집 매뉴얼" }} />
      <Stack.Screen name="HomeManualDetail" component={HomeManualDetailScreen} options={{ title: "매뉴얼 상세" }} />
      <Stack.Screen name="AccountbookHome" component={AccountbookHomeScreen} options={{ title: "가계부" }} />
      <Stack.Screen name="AccountbookEntries" component={AccountbookEntriesScreen} options={{ title: "생활비 내역" }} />
      <Stack.Screen name="AccountbookEntryCreate" component={AccountbookEntryCreateScreen} options={{ title: "지출 기록하기" }} />
      <Stack.Screen name="FixedExpenseList" component={FixedExpenseListScreen} options={{ title: "고정지출 알림" }} />
      <Stack.Screen name="FixedExpenseCreate" component={FixedExpenseCreateScreen} options={{ title: "고정지출 등록" }} />
      <Stack.Screen name="FixedExpenseDetail" component={FixedExpenseDetailScreen} options={{ title: "고정지출 상세" }} />
      <Stack.Screen name="FixedExpensePayment" component={FixedExpensePaymentScreen} options={{ title: "납부 완료" }} />
    </Stack.Navigator>
  );
}
