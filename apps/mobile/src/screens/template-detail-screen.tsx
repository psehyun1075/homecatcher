import { useState } from "react";
import { CommonActions } from "@react-navigation/native";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError } from "../api/client";
import { applyTemplate, getTemplate } from "../api/templates-api";
import { useFamily } from "../family/family-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { Screen } from "../components/screen";
import type { OnboardingStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<OnboardingStackParamList, "TemplateDetail">;

const labels = {
  HOUSEHOLD_ITEM: "생필품",
  TODO_TASK: "할 일",
  HOME_MANUAL: "우리집 매뉴얼",
};

export function TemplateDetailScreen({ navigation, route }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [alreadyPrepared, setAlreadyPrepared] = useState(false);
  const [loading, setLoading] = useState(false);
  const { finishTemplateOnboarding } = useFamily();
  const goMain = () => {
    finishTemplateOnboarding();
    navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }));
  };
  const query = useQuery({
    queryKey: ["template", route.params.templateId],
    queryFn: () => getTemplate(route.params.templateId),
  });

  const start = async () => {
    setLoading(true);
    setMessage(null);
    setAlreadyPrepared(false);
    try {
      await applyTemplate(route.params.familyId, route.params.templateId);
      goMain();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setMessage("이미 우리집에 준비된 템플릿이에요.");
        setAlreadyPrepared(true);
        return;
      }
      setMessage(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    } finally {
      setLoading(false);
    }
  };

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen>
        <ErrorState message={query.error?.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const template = query.data.template;

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>{template.name}</Text>
        <Text style={screenStyles.subtitle}>{template.description}</Text>
        {template.items.map((item) => (
          <Text key={item.id} style={screenStyles.cardText}>
            {labels[item.itemType]} · {item.title}
          </Text>
        ))}
        {message ? <Text style={screenStyles.errorText}>{message}</Text> : null}
        {alreadyPrepared ? (
          <AppButton title="확인" onPress={goMain} />
        ) : (
          <AppButton title="이 템플릿으로 시작하기" onPress={start} loading={loading} />
        )}
        <AppButton title="지금은 건너뛰기" onPress={goMain} variant="ghost" />
      </AppCard>
    </Screen>
  );
}
