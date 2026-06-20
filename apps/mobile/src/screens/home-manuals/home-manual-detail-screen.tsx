import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { RemoteImage } from "../../components/remote-image";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useHomeManual } from "../../features/home-manuals/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "HomeManualDetail">;

export function HomeManualDetailScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useHomeManual(selectedFamilyId, route.params.manualId);

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="매뉴얼을 불러오고 있어요." />
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen>
        <ErrorState message={query.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void query.refetch()} />
        <AppButton title="목록으로 돌아가기" onPress={() => navigation.goBack()} variant="secondary" />
      </Screen>
    );
  }

  const manual = query.data.homeManual;
  const steps = [...manual.steps].sort((left, right) => {
    const leftOrder = left.sortOrder ?? left.stepNo ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? right.stepNo ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.id.localeCompare(right.id);
  });

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.eyebrow}>{manual.isPinned ? "고정 매뉴얼" : "우리집 매뉴얼"}</Text>
        <Text style={screenStyles.title}>{manual.title}</Text>
        <Text style={screenStyles.subtitle}>{manual.category ?? "카테고리 없음"}</Text>
        {manual.description ? <Text style={screenStyles.cardText}>{manual.description}</Text> : null}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>단계별로 보기</Text>
        {steps.length === 0 ? (
          <Text style={screenStyles.cardText}>아직 단계가 없어요.</Text>
        ) : (
          steps.map((step, index) => (
            <View key={step.id} style={styles.stepBox}>
              <Text style={screenStyles.cardTitle}>
                {index + 1}. {step.title}
              </Text>
              {step.description ? <Text style={screenStyles.cardText}>{step.description}</Text> : null}
              {step.warning ? <Text style={screenStyles.errorText}>{step.warning}</Text> : null}
              {step.mediaUrl ? <RemoteImage uri={step.mediaUrl} label={`${step.title} 이미지`} size={180} /> : null}
            </View>
          ))
        )}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>연결된 정보</Text>
        {manual.relations.length === 0 ? (
          <Text style={screenStyles.cardText}>아직 연결된 생필품이나 할 일이 없어요.</Text>
        ) : (
          manual.relations.map((relation) => (
            <Text key={relation.id} style={screenStyles.cardText}>
              {relation.householdItem ? `생필품 · ${relation.householdItem.name}` : relation.todo ? `할 일 · ${relation.todo.title}` : "연결 대상을 확인할 수 없어요."}
            </Text>
          ))
        )}
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepBox: {
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
});
