import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useAuth } from "../../auth/auth-context";
import { useFamily } from "../../family/family-context";
import { useFamilyMembers } from "../../features/family-members/queries";
import { useCreateAppreciation } from "../../features/feed/mutations";
import { useFamilyFeed } from "../../features/feed/queries";
import type { Activity } from "../../features/feed/types";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { formatDateTime } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FamilyFeed">;

export function FamilyFeedScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const { user } = useAuth();
  const feedQuery = useFamilyFeed(selectedFamilyId);
  const membersQuery = useFamilyMembers(selectedFamilyId);
  const activities = useMemo(() => uniqueActivities(feedQuery.data?.pages.flatMap((page) => page.activities) ?? []), [feedQuery.data]);
  const myMemberId = membersQuery.data?.members.find((member) => member.user?.id === user?.id)?.id ?? null;

  if (feedQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="우리집 소식을 불러오고 있어요." />
      </Screen>
    );
  }

  if (feedQuery.error) {
    return (
      <Screen>
        <ErrorState message={feedQuery.error.message} onRetry={() => void feedQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={screenStyles.title}>우리집 소식</Text>
      <Text style={screenStyles.subtitle}>가족이 함께 처리한 일을 따뜻하게 확인해요.</Text>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={feedQuery.isRefetching} onRefresh={() => void feedQuery.refetch()} tintColor={colors.primaryDark} />}
        ListEmptyComponent={<EmptyState title={"아직 우리집 소식이 없어요.\n함께 처리한 일이 생기면 여기에 모아둘게요."} />}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            myMemberId={myMemberId}
            memberState={membersQuery.isLoading ? "loading" : membersQuery.error ? "error" : "ready"}
            onRetryMembers={() => void membersQuery.refetch()}
            onOpen={() => navigation.navigate("ActivityDetail", { activityId: item.id })}
          />
        )}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) void feedQuery.fetchNextPage();
        }}
        ListFooterComponent={feedQuery.isFetchingNextPage ? <LoadingState message="소식을 더 불러오고 있어요." /> : null}
      />
    </Screen>
  );
}

function ActivityCard({
  activity,
  myMemberId,
  memberState,
  onRetryMembers,
  onOpen,
}: {
  activity: Activity;
  myMemberId: string | null;
  memberState: "loading" | "error" | "ready";
  onRetryMembers: () => void;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const mutation = useCreateAppreciation(activity.id);
  const [localAppreciated, setLocalAppreciated] = useState(activity.appreciatedByMe);
  const [localCount, setLocalCount] = useState(activity.appreciationCount);
  useEffect(() => {
    if (mutation.isPending) return;
    setLocalAppreciated(activity.appreciatedByMe);
    setLocalCount(activity.appreciationCount);
  }, [activity.id, activity.appreciatedByMe, activity.appreciationCount, mutation.isPending]);

  const isMine = Boolean(myMemberId && activity.actor?.memberId === myMemberId);
  const canAppreciate = Boolean(activity.actor && memberState === "ready" && myMemberId && !isMine && !localAppreciated);

  const sendThanks = () => {
    if (!selectedFamilyId || mutation.isPending || !canAppreciate) return;
    mutation.mutate(
      {},
      {
        onSuccess: async () => {
          setLocalAppreciated(true);
          setLocalCount((count) => count + 1);
          await invalidateFeedQueries(queryClient, selectedFamilyId, activity.id);
          Alert.alert("고마운 마음을 전했어요.");
        },
        onError: (error) => Alert.alert(error.message),
      },
    );
  };

  return (
    <AppCard>
      <Text style={screenStyles.eyebrow}>{activityTypeLabel(activity.activityType)}</Text>
      <Text style={screenStyles.cardTitle}>{activity.title || "우리집 활동"}</Text>
      <Text style={screenStyles.cardText} numberOfLines={2}>
        {activity.message || (activity.actor ? `${activity.actor.displayName ?? "가족"}님이 함께했어요.` : "가족이 우리집 일을 함께 처리했어요.")}
      </Text>
      <Text style={screenStyles.cardText}>{activity.actor?.displayName ?? "홈캐처"} · {formatDateTime(activity.occurredAt)}</Text>
      <View style={screenStyles.row}>
        <Text style={screenStyles.cardText}>고마워요 {localCount}개</Text>
        {activity.actor && memberState === "loading" ? <Text style={screenStyles.cardText}>가족 정보를 확인하고 있어요.</Text> : null}
        {activity.actor && memberState === "error" ? <AppButton title="가족 정보 다시 확인" onPress={onRetryMembers} variant="secondary" /> : null}
        {activity.actor && memberState === "ready" && !isMine ? (
          <AppButton title={localAppreciated ? "고마워요 보냄" : "고마워요"} onPress={sendThanks} disabled={!canAppreciate || mutation.isPending} loading={mutation.isPending} variant="secondary" />
        ) : null}
      </View>
      <AppButton title="자세히 보기" onPress={onOpen} variant="ghost" />
    </AppCard>
  );
}

export function activityTypeLabel(activityType: Activity["activityType"]) {
  return {
    TODO_COMPLETED: "할 일을 완료했어요",
    HOUSEHOLD_ITEM_PURCHASED: "생필품을 주문했어요",
    FIXED_EXPENSE_PAID: "고정지출 납부를 기록했어요",
    FAMILY_EVENT_CREATED: "가족 일정을 추가했어요",
    HOME_MANUAL_CREATED: "우리집 매뉴얼을 추가했어요",
    TEMPLATE_APPLIED: "우리집 템플릿을 준비했어요",
  }[activityType];
}

export async function invalidateFeedQueries(queryClient: ReturnType<typeof useQueryClient>, familyId: string, activityId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "feed"] }),
    activityId ? queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "activity", activityId] }) : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "notifications", "unread-count"] }),
  ]);
}

function uniqueActivities(activities: Activity[]) {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    if (seen.has(activity.id)) return false;
    seen.add(activity.id);
    return true;
  });
}
