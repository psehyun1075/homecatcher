import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { getUnreadCount } from "../api/home-api";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { Screen } from "../components/screen";
import { useAuth } from "../auth/auth-context";
import { useFamily } from "../family/family-context";
import type { MyHomeStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "MyHomeMain">;

export function MyHomeScreen({ navigation }: Props) {
  const { signOut, sessionStorageWarning, clearSessionStorageWarning } = useAuth();
  const {
    families,
    selectedFamilyId,
    isLoadingFamilies,
    isSwitchingFamily,
    familyError,
    familyStorageWarning,
    clearFamilyStorageWarning,
    refetchFamilies,
    selectFamily,
  } = useFamily();
  const unreadQuery = useQuery({
    queryKey: ["familyScope", selectedFamilyId, "notifications", "unread-count"],
    queryFn: () => getUnreadCount(selectedFamilyId!),
    enabled: Boolean(selectedFamilyId),
  });

  return (
    <Screen>
      <Text style={screenStyles.title}>우리집</Text>
      <Text style={screenStyles.subtitle}>가족을 바꾸거나, 다음 단계에서 템플릿을 다시 적용할 수 있게 준비할게요.</Text>

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
        <Text style={screenStyles.cardTitle}>가족 전환</Text>
        {isLoadingFamilies || isSwitchingFamily ? <LoadingState message="우리집을 바꾸고 있어요." /> : null}
        {familyError ? <ErrorState message={familyError.message} onRetry={refetchFamilies} /> : null}
        {!isLoadingFamilies && families.length === 0 ? <EmptyState title="연결된 가족이 없어요." /> : null}
        {families.map((family) => (
          <AppButton
            key={family.id}
            title={`${family.familyName}${family.id === selectedFamilyId ? " · 선택됨" : ""}`}
            onPress={() => void selectFamily(family)}
            disabled={family.id === selectedFamilyId}
            variant={family.id === selectedFamilyId ? "primary" : "secondary"}
          />
        ))}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>가족 초대하기</Text>
        <Text style={screenStyles.cardText}>초대 코드를 만들어 가족이 우리집에 함께 들어올 수 있게 해요.</Text>
        <AppButton title="가족 초대하기" onPress={() => navigation.navigate("FamilyInvite")} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>우리집 소식</Text>
        <Text style={screenStyles.cardText}>가족이 함께 처리한 일을 따뜻하게 확인해요.</Text>
        <AppButton title="우리집 소식 보기" onPress={() => navigation.navigate("FamilyFeed")} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>알림함</Text>
        <Text style={screenStyles.cardText}>놓치기 쉬운 우리집 일을 모아봤어요. {unreadQuery.data?.unreadCount ? `읽지 않은 알림 ${unreadQuery.data.unreadCount}개` : ""}</Text>
        <AppButton title="알림함 보기" onPress={() => navigation.navigate("NotificationList")} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>우리집 매뉴얼</Text>
        <Text style={screenStyles.cardText}>매번 설명하지 않아도 함께 볼 수 있어요.</Text>
        <AppButton title="우리집 매뉴얼 보기" onPress={() => navigation.navigate("HomeManualList")} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>고정지출 알림</Text>
        <Text style={screenStyles.cardText}>월세, 관리비처럼 돈 나가는 날을 함께 챙겨요.</Text>
        <AppButton title="고정지출 보기" onPress={() => navigation.navigate("FixedExpenseList")} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>가계부</Text>
        <Text style={screenStyles.cardText}>우리집 생활비를 카테고리별로 확인해요.</Text>
        <AppButton title="가계부 보기" onPress={() => navigation.navigate("AccountbookHome")} variant="secondary" />
      </AppCard>

      <AppButton title="로그아웃" onPress={() => void signOut()} variant="ghost" />
    </Screen>
  );
}
