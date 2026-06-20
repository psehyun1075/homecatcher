import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "../components/loading-state";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function SplashScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HomeCatcher</Text>
        </View>
        <Text style={styles.title}>홈캐처</Text>
        <Text style={styles.subtitle}>우리집 일을 놓치지 않게</Text>
        <LoadingState message="처음엔 필요한 것만 준비할게요." />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  badgeText: { color: colors.white, fontWeight: "800" },
  title: { color: colors.text, fontSize: 38, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 18, fontWeight: "700" },
});
