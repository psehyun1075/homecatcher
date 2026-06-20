import { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { acceptInvite, getInvite } from "../api/families-api";
import { useFamily } from "../family/family-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { AppInput } from "../components/app-input";
import { Screen } from "../components/screen";
import { screenStyles } from "./styles";

export function InviteJoinScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { refetchFamilies, startNewFamilyTemplateOnboarding } = useFamily();
  const queryClient = useQueryClient();

  const checkInvite = async () => {
    const code = inviteCode.trim();
    if (!code) return setError("초대 코드를 입력해 주세요.");
    setLoading(true);
    setError(null);
    try {
      const response = await getInvite(code);
      setFamilyName(response.invite.familyName);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "초대 코드를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (loading || submitted) return;
    setLoading(true);
    setError(null);
    try {
      const response = await acceptInvite(inviteCode.trim());
      setSubmitted(true);
      await startNewFamilyTemplateOnboarding({ id: response.family.id, familyName: response.family.familyName, memberCount: 1 });
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
        <Text style={screenStyles.title}>초대 코드로 우리집에 들어가요.</Text>
        <Text style={screenStyles.subtitle}>가족에게 받은 코드를 입력해 주세요.</Text>
        <AppInput label="초대 코드" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" />
        {familyName ? <Text style={screenStyles.cardText}>{familyName}에 참여할 수 있어요.</Text> : null}
        {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
        {familyName ? (
          <AppButton title={loading || submitted ? "우리집 준비 중..." : "참여하기"} onPress={join} loading={loading || submitted} />
        ) : (
          <AppButton title="초대 코드 확인" onPress={checkInvite} loading={loading} />
        )}
      </AppCard>
    </Screen>
  );
}
