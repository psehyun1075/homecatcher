import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { AppButton } from "./app-button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>잠시 연결이 어려워요.</Text>
      <Text style={styles.message}>{message ?? "다시 불러올게요."}</Text>
      {onRetry ? <AppButton title="다시 시도" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
