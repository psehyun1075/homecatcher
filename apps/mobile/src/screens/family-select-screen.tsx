import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useFamily } from "../family/family-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { Screen } from "../components/screen";
import type { OnboardingStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<OnboardingStackParamList, "FamilySelect">;

export function FamilySelectScreen({ navigation }: Props) {
  const { families, isLoadingFamilies, familyError, refetchFamilies, selectFamily } = useFamily();

  if (isLoadingFamilies) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (familyError) {
    return (
      <Screen>
        <ErrorState message={familyError.message} onRetry={refetchFamilies} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={screenStyles.title}>어느 우리집으로 들어갈까요?</Text>
      {families.length === 0 ? <EmptyState title="아직 연결된 가족이 없어요." message="우리집을 만들거나 초대 코드로 참여해요." /> : null}
      {families.map((family) => (
        <AppCard key={family.id}>
          <Text style={screenStyles.cardTitle}>{family.familyName}</Text>
          <Text style={screenStyles.cardText}>
            내 역할 {family.role ?? "MEMBER"} · 구성원 {family.memberCount}명
          </Text>
          <AppButton title="선택" onPress={() => void selectFamily(family)} />
        </AppCard>
      ))}
      <AppButton title="새 가족 만들기" onPress={() => navigation.navigate("FamilyCreate")} variant="secondary" />
      <AppButton title="초대 코드로 참여" onPress={() => navigation.navigate("InviteJoin")} variant="ghost" />
    </Screen>
  );
}
