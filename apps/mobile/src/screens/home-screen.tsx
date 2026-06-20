import { useCallback, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";

import { getCalendarDay, getUnreadCount } from "../api/home-api";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { Screen } from "../components/screen";
import { useAuth } from "../auth/auth-context";
import { useFamily } from "../family/family-context";
import type { MainTabParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type HomeNavigation = BottomTabNavigationProp<MainTabParamList, "Home">;

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { user, sessionStorageWarning, clearSessionStorageWarning } = useAuth();
  const { selectedFamily, familyStorageWarning, clearFamilyStorageWarning } = useFamily();
  const [dateKey, setDateKey] = useState(todayDateKey);

  const refreshDateKey = useCallback(() => {
    setDateKey(todayDateKey());
  }, []);

  useFocusEffect(refreshDateKey);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshDateKey();
      }
    });
    return () => subscription.remove();
  }, [refreshDateKey]);

  const unreadQuery = useQuery({
    queryKey: ["familyScope", selectedFamily?.id, "notifications", "unread-count"],
    queryFn: () => getUnreadCount(selectedFamily!.id),
    enabled: Boolean(selectedFamily),
  });

  const calendarQuery = useQuery({
    queryKey: ["familyScope", selectedFamily?.id, "calendar", "day", dateKey],
    queryFn: () => getCalendarDay(selectedFamily!.id, dateKey),
    enabled: Boolean(selectedFamily),
  });

  if (!selectedFamily) {
    return (
      <Screen>
        <ErrorState message="선택된 우리집을 찾을 수 없어요." />
      </Screen>
    );
  }

  const calendarItems = calendarQuery.data?.items ?? [];

  return (
    <Screen>
      <View>
        <Text style={screenStyles.eyebrow}>{selectedFamily.familyName}</Text>
        <Text style={screenStyles.title}>오늘 홈캐처가 챙긴 일이에요</Text>
        <Text style={screenStyles.subtitle}>
          {user?.name ?? "가족"}님, {todayLabel(dateKey)}
        </Text>
      </View>

      {sessionStorageWarning ? (
        <AppCard>
          <Text style={screenStyles.cardText}>{sessionStorageWarning}</Text>
          <AppButton title="확인" onPress={clearSessionStorageWarning} variant="ghost" />
        </AppCard>
      ) : null}

      {familyStorageWarning ? (
        <AppCard>
          <Text style={screenStyles.cardText}>{familyStorageWarning}</Text>
          <AppButton title="확인" onPress={clearFamilyStorageWarning} variant="ghost" />
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={screenStyles.cardTitle}>읽지 않은 알림</Text>
        {unreadQuery.isLoading ? (
          <LoadingState message="알림을 확인하고 있어요." />
        ) : unreadQuery.error ? (
          <ErrorState message={unreadQuery.error.message} onRetry={() => void unreadQuery.refetch()} />
        ) : (
          <Text style={screenStyles.cardText}>{unreadQuery.data?.unreadCount ?? 0}개가 기다리고 있어요.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>오늘 일정</Text>
        {calendarQuery.isLoading ? (
          <LoadingState message="오늘 일을 불러오고 있어요." />
        ) : calendarQuery.error ? (
          <ErrorState message={calendarQuery.error.message} onRetry={() => void calendarQuery.refetch()} />
        ) : calendarItems.length === 0 ? (
          <EmptyState title="오늘은 급하게 챙길 일이 없어요." />
        ) : (
          calendarItems.slice(0, 4).map((item) => (
            <Text key={item.occurrenceKey} style={screenStyles.cardText}>
              {item.title}
            </Text>
          ))
        )}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>빠른 행동</Text>
        <AppButton title="생필품 보기" onPress={() => navigation.navigate("HouseholdItems")} variant="secondary" />
        <AppButton title="할 일 보기" onPress={() => navigation.navigate("Todos")} variant="secondary" />
        <AppButton title="가족 캘린더 보기" onPress={() => navigation.navigate("Calendar")} variant="secondary" />
      </AppCard>
    </Screen>
  );
}
