import { Text, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import type { CalendarItem } from "../../features/calendar/types";
import { useCalendarDay } from "../../features/calendar/queries";
import type { CalendarStackParamList, MainTabParamList } from "../../navigation/types";
import { formatDateTime, formatMoney } from "../../utils/format";
import { screenStyles } from "../styles";
import { calendarStyles } from "./calendar-styles";

type Props = NativeStackScreenProps<CalendarStackParamList, "CalendarDay">;

export function CalendarDayScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useCalendarDay(selectedFamilyId, route.params.date);
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  const items = query.data?.day.items ?? [];

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>{route.params.date}</Text>
        <Text style={screenStyles.subtitle}>이 날 함께 챙길 일을 모았어요.</Text>
      </View>
      <AppButton title="이 날 일정 추가" onPress={() => navigation.navigate("FamilyEventCreate", { date: route.params.date })} />

      {query.isLoading ? (
        <LoadingState message="하루 일정을 불러오고 있어요." />
      ) : query.error ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="이 날은 챙길 일이 없어요." />
      ) : (
        items.map((item) => (
          <AppCard key={item.occurrenceKey}>
            <View style={calendarStyles.itemCard}>
              <Text style={calendarStyles.typeText}>{sourceLabel(item.sourceType)}</Text>
              <Text style={screenStyles.cardTitle}>{item.title}</Text>
              <Text style={screenStyles.cardText}>{item.allDay ? "종일" : formatTimeRange(item)}</Text>
              <Text style={screenStyles.cardText}>{statusLabel(item.status, item.sourceType)}</Text>
              {item.sourceType === "FIXED_EXPENSE" && item.amount ? <Text style={screenStyles.cardText}>{formatMoney(item.amount, item.currency ?? "KRW")}</Text> : null}
              <AppButton title="자세히 보기" variant="secondary" onPress={() => openItem(item, route.params.date, navigation, tabNavigation)} />
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

function openItem(
  item: CalendarItem,
  dateKey: string,
  navigation: Props["navigation"],
  tabNavigation?: BottomTabNavigationProp<MainTabParamList>,
) {
  if (item.sourceType === "FAMILY_EVENT") {
    navigation.navigate("FamilyEventDetail", { eventId: item.sourceId });
    return;
  }
  if (item.sourceType === "TODO") {
    tabNavigation?.navigate("Todos", { screen: "TodoDetail", params: { todoId: item.sourceId } });
    return;
  }
  if (item.sourceType === "HOUSEHOLD_ITEM") {
    tabNavigation?.navigate("HouseholdItems", { screen: "HouseholdItemDetail", params: { itemId: item.sourceId } });
    return;
  }
  tabNavigation?.navigate("MyHome", {
    screen: "FixedExpenseDetail",
    params: {
      fixedExpenseId: item.sourceId,
      dueDate: dateKey,
      occurrenceStatus: item.status,
      occurrenceKey: item.occurrenceKey,
    },
  });
}

function sourceLabel(sourceType: CalendarItem["sourceType"]) {
  return {
    FAMILY_EVENT: "가족 일정",
    TODO: "할 일",
    FIXED_EXPENSE: "고정지출",
    HOUSEHOLD_ITEM: "생필품 소진 예상",
  }[sourceType];
}

function statusLabel(status: CalendarItem["status"], sourceType: CalendarItem["sourceType"]) {
  if (sourceType === "FAMILY_EVENT") return "예정";
  if (sourceType === "TODO") return "할 일";
  return {
    SCHEDULED: "예정",
    UPCOMING: "예정",
    DUE: "오늘",
    OVERDUE: "연체",
    PAID: "납부 완료",
  }[status];
}

function formatTimeRange(item: CalendarItem) {
  if (!item.startsAt) return "시간 미정";
  const start = formatDateTime(item.startsAt);
  const end = item.endsAt ? ` - ${formatDateTime(item.endsAt)}` : "";
  return `${start}${end}`;
}
