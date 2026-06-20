import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

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
        <Text style={screenStyles.cardTitle}>우리집 매뉴얼</Text>
        <Text style={screenStyles.cardText}>매번 설명하지 않아도 함께 볼 수 있어요.</Text>
        <AppButton title="우리집 매뉴얼 보기" onPress={() => navigation.navigate("HomeManualList")} variant="secondary" />
      </AppCard>

      <AppButton title="로그아웃" onPress={() => void signOut()} variant="ghost" />
    </Screen>
  );
}
