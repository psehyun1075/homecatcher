import { CommonActions } from "@react-navigation/native";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { listTemplates } from "../api/templates-api";
import { useFamily } from "../family/family-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { Screen } from "../components/screen";
import type { OnboardingStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<OnboardingStackParamList, "TemplateSelect">;

export function TemplateSelectScreen({ navigation, route }: Props) {
  const query = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const { finishTemplateOnboarding } = useFamily();
  const goMain = () => {
    finishTemplateOnboarding();
    navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }));
  };

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="우리집에 맞는 템플릿을 불러오고 있어요." />
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

  const templates = query.data?.templates ?? [];

  return (
    <Screen>
      <Text style={screenStyles.eyebrow}>빠른 시작</Text>
      <Text style={screenStyles.title}>우리집에 맞는 템플릿을 골라보세요.</Text>
      <Text style={screenStyles.subtitle}>나중에 언제든 바꿀 수 있어요.</Text>
      {templates.length === 0 ? (
        <EmptyState title="지금 준비된 템플릿이 없어요." message="지금은 건너뛰고 나중에 다시 확인할 수 있어요." />
      ) : null}
      {templates.map((template) => (
        <AppCard
          key={template.id}
          accessibilityLabel={`${template.name} 템플릿 보기`}
          onPress={() => navigation.navigate("TemplateDetail", { familyId: route.params.familyId, templateId: template.id })}
        >
          <Text style={screenStyles.cardTitle}>{template.name}</Text>
          <Text style={screenStyles.cardText}>{template.description}</Text>
          <Text style={screenStyles.cardText}>
            생필품 {template.itemCounts.householdItems} · 할 일 {template.itemCounts.todos} · 매뉴얼 {template.itemCounts.manuals}
          </Text>
        </AppCard>
      ))}
      {route.params.canSkip ? <AppButton title="지금은 건너뛰기" onPress={goMain} variant="ghost" /> : null}
    </Screen>
  );
}
