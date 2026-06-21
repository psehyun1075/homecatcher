import { useState } from "react";
import { Alert, Platform, Share, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";

import { createInvite } from "../api/families-api";
import type { Invite } from "../api/types";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { Screen } from "../components/screen";
import { useFamily } from "../family/family-context";
import type { MyHomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { formatDateTime } from "../utils/format";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FamilyInvite">;

export function FamilyInviteScreen(_: Props) {
  const { selectedFamily, selectedFamilyId } = useFamily();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createInvite(selectedFamilyId!),
  });

  const issueInvite = async () => {
    if (!selectedFamilyId || mutation.isPending) return;
    setError(null);
    try {
      const response = await mutation.mutateAsync();
      setInvite(response.invite);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "초대 코드를 만들지 못했어요.");
    }
  };

  const copyCode = async () => {
    if (!invite?.code) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite.code);
        Alert.alert("초대 코드를 복사했어요.");
        return;
      }
      await Clipboard.setStringAsync(invite.code);
      Alert.alert("초대 코드를 복사했어요.");
    } catch {
      Alert.alert("초대 코드를 복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.");
    }
  };

  const shareCode = async () => {
    if (!invite?.code) return;
    try {
      await Share.share({
        message: `${selectedFamily?.familyName ?? "우리집"}에 초대할게요.\n홈캐처 초대 코드: ${invite.code}`,
      });
    } catch {
      Alert.alert("공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>가족 초대하기</Text>
        <Text style={screenStyles.subtitle}>초대 코드를 가족에게 보내면 우리집에 함께 참여할 수 있어요.</Text>
      </View>

      <AppButton title={mutation.isPending ? "초대 코드 만드는 중..." : invite ? "새 코드 만들기" : "초대 코드 만들기"} onPress={issueInvite} loading={mutation.isPending} disabled={mutation.isPending} />

      {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}

      {invite ? (
        <AppCard>
          <Text style={screenStyles.cardTitle}>초대 코드</Text>
          <View style={styles.codeBox}>
            <Text selectable style={styles.codeText}>
              {invite.code}
            </Text>
          </View>
          <Text style={screenStyles.cardText}>만료: {formatDateTime(invite.expiresAt)}</Text>
          <AppButton title="코드 복사" onPress={copyCode} variant="secondary" />
          <AppButton title="공유하기" onPress={shareCode} />
        </AppCard>
      ) : (
        <AppCard>
          <Text style={screenStyles.cardText}>아직 만든 초대 코드가 없어요. 코드를 만든 뒤 가족에게 공유해 주세요.</Text>
        </AppCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  codeText: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
