import { useEffect, useRef } from "react";
import { Alert, Text, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useArchiveNotification, useMarkNotificationRead } from "../../features/notifications/mutations";
import { useNotification } from "../../features/notifications/queries";
import type { MainTabParamList, MyHomeStackParamList } from "../../navigation/types";
import { formatDateTime } from "../../utils/format";
import { openInternalDeepLink } from "../../utils/internal-deep-link";
import { screenStyles } from "../styles";
import { notificationTypeLabel } from "./notification-list-screen";

type Props = NativeStackScreenProps<MyHomeStackParamList, "NotificationDetail">;

export function NotificationDetailScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const query = useNotification(selectedFamilyId, route.params.notificationId);
  const readMutation = useMarkNotificationRead();
  const archiveMutation = useArchiveNotification();
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  const readAttemptedRef = useRef(false);
  const notification = query.data?.notification;

  useEffect(() => {
    if (!selectedFamilyId || !notification || notification.readAt || route.params.readHandled || readAttemptedRef.current) return;
    readAttemptedRef.current = true;
    readMutation.mutate(notification.id, {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notification", notification.id] }),
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications", "unread-count"] }),
        ]);
      },
      onError: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notification", notification.id] }),
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications", "unread-count"] }),
        ]);
        Alert.alert("알림을 읽음으로 표시하지 못했어요. 내용을 확인하는 데는 문제가 없어요.");
      },
    });
  }, [notification, queryClient, readMutation, route.params.readHandled, selectedFamilyId]);

  const archive = async () => {
    if (!selectedFamilyId || !notification || archiveMutation.isPending) return;
    try {
      await archiveMutation.mutateAsync(notification.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications", "unread-count"] }),
      ]);
      Alert.alert("알림을 보관했어요.");
      navigation.goBack();
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

  if (query.error || !notification) {
    return (
      <Screen>
        <ErrorState message={query.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={screenStyles.eyebrow}>{notificationTypeLabel(notification.notificationType)}</Text>
        <Text style={screenStyles.title}>{notification.title || "홈캐처 알림"}</Text>
        <Text style={screenStyles.subtitle}>{notification.message || "확인할 우리집 소식이 있어요."}</Text>
      </View>

      <AppCard>
        <Text style={screenStyles.cardText}>도착: {formatDateTime(notification.availableAt)}</Text>
        <Text style={screenStyles.cardText}>읽음: {notification.readAt ? formatDateTime(notification.readAt) : "아직 읽지 않음"}</Text>
        {notification.deepLink ? (
          <AppButton
            title="관련 화면 보기"
            variant="secondary"
            onPress={() => {
              const opened = openInternalDeepLink(notification.deepLink, navigation, tabNavigation);
              if (!opened) Alert.alert("관련 정보를 찾을 수 없어요.");
            }}
          />
        ) : null}
      </AppCard>

      <AppButton title="알림 보관" onPress={archive} loading={archiveMutation.isPending} disabled={archiveMutation.isPending} variant="secondary" />
    </Screen>
  );
}
