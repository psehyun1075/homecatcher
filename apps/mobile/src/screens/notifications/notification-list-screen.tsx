import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useMarkNotificationRead, useReadAllNotifications } from "../../features/notifications/mutations";
import { useNotifications } from "../../features/notifications/queries";
import type { AppNotification } from "../../features/notifications/types";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { formatDateTime } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "NotificationList">;

export function NotificationListScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotifications(selectedFamilyId, { unreadOnly });
  const readMutation = useMarkNotificationRead();
  const readAllMutation = useReadAllNotifications();
  const [readingId, setReadingId] = useState<string | null>(null);
  const notifications = useMemo(() => uniqueNotifications(query.data?.pages.flatMap((page) => page.notifications) ?? []), [query.data]);

  const invalidate = async () => {
    if (!selectedFamilyId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications", "unread-count"] }),
    ]);
  };

  const openNotification = async (notification: AppNotification) => {
    if (readingId || !selectedFamilyId) return;
    const shouldMarkRead = !notification.readAt;
    setReadingId(notification.id);
    navigation.navigate("NotificationDetail", { notificationId: notification.id, readHandled: shouldMarkRead });
    if (!shouldMarkRead) {
      setReadingId(null);
      return;
    }
    try {
      await readMutation.mutateAsync(notification.id);
      await invalidate();
    } catch {
      await invalidate();
      Alert.alert("알림을 읽음으로 표시하지 못했어요. 내용을 확인하는 데는 문제가 없어요.");
    } finally {
      setReadingId(null);
    }
  };

  const readAll = async () => {
    if (!selectedFamilyId || readAllMutation.isPending) return;
    try {
      await readAllMutation.mutateAsync(selectedFamilyId);
      await invalidate();
      Alert.alert("알림을 모두 읽었어요.");
    } catch (error) {
      Alert.alert(error instanceof Error ? error.message : "잠시 연결이 어려워요.");
    }
  };

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="알림을 불러오고 있어요." />
      </Screen>
    );
  }

  if (query.error) {
    return (
      <Screen>
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={screenStyles.title}>알림함</Text>
      <Text style={screenStyles.subtitle}>놓치기 쉬운 우리집 일을 모아봤어요.</Text>
      <View style={styles.filterRow}>
        <AppButton title="전체" onPress={() => setUnreadOnly(false)} variant={unreadOnly ? "secondary" : "primary"} />
        <AppButton title="읽지 않음" onPress={() => setUnreadOnly(true)} variant={unreadOnly ? "primary" : "secondary"} />
        <AppButton title="모두 읽음" onPress={readAll} loading={readAllMutation.isPending} disabled={readAllMutation.isPending} variant="ghost" />
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primaryDark} />}
        ListEmptyComponent={<EmptyState title={unreadOnly ? "읽지 않은 알림이 없어요." : "아직 도착한 알림이 없어요."} />}
        renderItem={({ item }) => <NotificationCard notification={item} loading={readingId === item.id} onPress={() => void openNotification(item)} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <LoadingState message="알림을 더 불러오고 있어요." /> : null}
      />
    </Screen>
  );
}

function NotificationCard({ notification, loading, onPress }: { notification: AppNotification; loading: boolean; onPress: () => void }) {
  const unread = !notification.readAt;
  return (
    <AppCard>
      <View style={[styles.notificationHeader, unread ? styles.unread : null]}>
        <Text style={screenStyles.eyebrow}>{notificationTypeLabel(notification.notificationType)}</Text>
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>
      <Text style={screenStyles.cardTitle} numberOfLines={1}>{notification.title || "홈캐처 알림"}</Text>
      <Text style={screenStyles.cardText} numberOfLines={2}>{notification.message || "확인할 우리집 소식이 있어요."}</Text>
      <Text style={screenStyles.cardText}>{formatDateTime(notification.availableAt)}</Text>
      <AppButton title="열어보기" onPress={onPress} loading={loading} disabled={loading} variant="secondary" />
    </AppCard>
  );
}

export function notificationTypeLabel(type: AppNotification["notificationType"]) {
  return {
    ACTIVITY: "우리집 소식",
    TODO_DUE: "할 일",
    FIXED_EXPENSE_DUE: "고정지출",
    FAMILY_EVENT_START: "가족 일정",
    HOUSEHOLD_ITEM_RUNOUT: "생필품",
    APPRECIATION_RECEIVED: "고마워요",
  }[type] ?? "알림";
}

function uniqueNotifications(notifications: AppNotification[]) {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    if (seen.has(notification.id)) return false;
    seen.add(notification.id);
    return true;
  });
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  notificationHeader: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.sm,
  },
  unread: {
    backgroundColor: colors.accent,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
    marginRight: spacing.sm,
  },
});
