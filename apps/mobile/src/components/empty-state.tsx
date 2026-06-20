import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
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
