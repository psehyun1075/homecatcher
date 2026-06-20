import { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { createFamily } from "../api/families-api";
import { useFamily } from "../family/family-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { AppInput } from "../components/app-input";
import { Screen } from "../components/screen";
import { screenStyles } from "./styles";

export function FamilyCreateScreen() {
  const [familyName, setFamilyName] = useState("우리집");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { refetchFamilies, startNewFamilyTemplateOnboarding } = useFamily();
  const queryClient = useQueryClient();

  const submit = async () => {
    if (loading || submitted) return;
    const name = familyName.trim();
    if (!name) return setError("가족 이름을 입력해 주세요.");
    setLoading(true);
    setError(null);
    try {
      const response = await createFamily(name);
      setSubmitted(true);
      await startNewFamilyTemplateOnboarding(response.family);
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await refetchFamilies();
    } catch (caught) {
      setSubmitted(false);
      setError(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>우리집 이름만 정하면 시작할 수 있어요.</Text>
        <Text style={screenStyles.subtitle}>나중에 언제든 바꿀 수 있어요.</Text>
        <AppInput label="가족 이름" value={familyName} onChangeText={setFamilyName} />
        {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
        <AppButton title={loading || submitted ? "우리집 준비 중..." : "우리집 만들기"} onPress={submit} loading={loading || submitted} />
      </AppCard>
    </Screen>
  );
}
