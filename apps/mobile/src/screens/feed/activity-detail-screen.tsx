import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useAuth } from "../../auth/auth-context";
import { useFamily } from "../../family/family-context";
import { useFamilyMembers } from "../../features/family-members/queries";
import { useCreateAppreciation, useDeleteAppreciation } from "../../features/feed/mutations";
import { useActivity, useAppreciations } from "../../features/feed/queries";
import type { Appreciation } from "../../features/feed/types";
import type { MainTabParamList, MyHomeStackParamList } from "../../navigation/types";
import { formatDateTime } from "../../utils/format";
import { openInternalDeepLink } from "../../utils/internal-deep-link";
import { screenStyles } from "../styles";
import { activityTypeLabel, invalidateFeedQueries } from "./family-feed-screen";

type Props = NativeStackScreenProps<MyHomeStackParamList, "ActivityDetail">;

export function ActivityDetailScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const { user } = useAuth();
  const activityQuery = useActivity(selectedFamilyId, route.params.activityId);
  const appreciationsQuery = useAppreciations(selectedFamilyId, route.params.activityId);
  const membersQuery = useFamilyMembers(selectedFamilyId);
  const createMutation = useCreateAppreciation(route.params.activityId);
  const deleteMutation = useDeleteAppreciation();
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activity = activityQuery.data?.activity;
  const appreciations = appreciationsQuery.data?.appreciations ?? [];
  const myMemberId = membersQuery.data?.members.find((member) => member.user?.id === user?.id)?.id ?? null;
  const myAppreciation = useMemo(() => appreciations.find((appreciation) => appreciation.fromMember.memberId === myMemberId), [appreciations, myMemberId]);
  const isMine = Boolean(myMemberId && activity?.actor?.memberId === myMemberId);
  const memberReady = !membersQuery.isLoading && !membersQuery.error && Boolean(myMemberId);
  const canAppreciate = Boolean(activity?.actor && memberReady && !isMine && !myAppreciation);

  const sendThanks = () => {
    if (!selectedFamilyId || !canAppreciate || createMutation.isPending) return;
    createMutation.mutate(
      { message: message.trim() || undefined },
      {
        onSuccess: async () => {
          setMessage("");
          setError(null);
          await invalidateFeedQueries(queryClient, selectedFamilyId, route.params.activityId);
          await queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "activity", route.params.activityId, "appreciations"] });
          Alert.alert("고마운 마음을 전했어요.");
        },
        onError: (submitError) => setError(submitError.message),
      },
    );
  };

  const cancelThanks = (appreciation: Appreciation) => {
    if (!selectedFamilyId || deleteMutation.isPending) return;
    deleteMutation.mutate(appreciation.id, {
      onSuccess: async () => {
        await invalidateFeedQueries(queryClient, selectedFamilyId, route.params.activityId);
        await queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "activity", route.params.activityId, "appreciations"] });
        Alert.alert("고마워요를 취소했어요.");
      },
      onError: (submitError) => setError(submitError.message),
    });
  };

  if (activityQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="활동을 불러오고 있어요." />
      </Screen>
    );
  }

  if (activityQuery.error || !activity) {
    return (
      <Screen>
        <ErrorState message={activityQuery.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void activityQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={screenStyles.eyebrow}>{activityTypeLabel(activity.activityType)}</Text>
        <Text style={screenStyles.title}>{activity.title || "우리집 활동"}</Text>
        <Text style={screenStyles.subtitle}>{activity.message || "가족이 우리집 일을 함께 처리했어요."}</Text>
      </View>

      <AppCard>
        <Text style={screenStyles.cardText}>함께한 사람: {activity.actor?.displayName ?? "홈캐처"}</Text>
        <Text style={screenStyles.cardText}>시간: {formatDateTime(activity.occurredAt)}</Text>
        <Text style={screenStyles.cardText}>고마워요 {activity.appreciationCount}개</Text>
        {activity.deepLink ? (
          <AppButton
            title="관련 화면 보기"
            variant="secondary"
            onPress={() => {
              const opened = openInternalDeepLink(activity.deepLink, navigation, tabNavigation);
              if (!opened) Alert.alert("관련 정보를 찾을 수 없어요.");
            }}
          />
        ) : null}
      </AppCard>

      {canAppreciate ? (
        <AppCard>
          <Text style={screenStyles.cardTitle}>고마운 마음 남기기</Text>
          <AppInput label="메시지" value={message} onChangeText={setMessage} maxLength={200} placeholder="선택 입력" />
          <AppButton title="고마워요 보내기" onPress={sendThanks} loading={createMutation.isPending} disabled={createMutation.isPending} />
        </AppCard>
      ) : myAppreciation ? (
        <AppCard>
          <Text style={screenStyles.cardTitle}>고마워요를 보냈어요</Text>
          {myAppreciation.message ? <Text style={screenStyles.cardText}>{myAppreciation.message}</Text> : null}
          <AppButton title="고마워요 취소" onPress={() => cancelThanks(myAppreciation)} loading={deleteMutation.isPending} disabled={deleteMutation.isPending} variant="secondary" />
        </AppCard>
      ) : (
        <AppCard>
          {membersQuery.isLoading && activity.actor ? <Text style={screenStyles.cardText}>가족 정보를 확인하고 있어요.</Text> : null}
          {membersQuery.error && activity.actor ? (
            <>
              <Text style={screenStyles.cardText}>가족 정보를 확인하지 못했어요. 지금은 고마워요를 보낼 수 없어요.</Text>
              <AppButton title="다시 확인" onPress={() => void membersQuery.refetch()} variant="secondary" />
            </>
          ) : null}
          {!membersQuery.isLoading && !membersQuery.error ? <Text style={screenStyles.cardText}>{activity.actor ? "내 활동에는 고마워요를 남길 수 없어요." : "홈캐처가 준비한 소식이에요."}</Text> : null}
        </AppCard>
      )}

      {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}

      <AppCard>
        <Text style={screenStyles.cardTitle}>받은 고마워요</Text>
        {appreciationsQuery.isLoading ? (
          <LoadingState message="고마워요를 불러오고 있어요." />
        ) : appreciationsQuery.error ? (
          <ErrorState message={appreciationsQuery.error.message} onRetry={() => void appreciationsQuery.refetch()} />
        ) : appreciations.length === 0 ? (
          <EmptyState title="아직 고마워요가 없어요." />
        ) : (
          appreciations.map((appreciation) => (
            <Text key={appreciation.id} style={screenStyles.cardText}>
              {appreciation.fromMember.displayName ?? "가족"} · {appreciation.message ?? "고마워요!"} · {formatDateTime(appreciation.createdAt)}
            </Text>
          ))
        )}
      </AppCard>
    </Screen>
  );
}
