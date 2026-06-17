import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F1E8" />
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HomeCatcher MVP</Text>
        </View>
        <Text style={styles.title}>홈캐처</Text>
        <Text style={styles.subtitle}>우리집 일을 놓치지 않게</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F1E8",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F6F1E8",
  },
  badge: {
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: "#1F4E5F",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  title: {
    color: "#17313C",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  subtitle: {
    color: "#4D5F66",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
