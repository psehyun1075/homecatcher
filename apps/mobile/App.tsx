import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

import { AuthProvider, useAuth } from "./src/auth/auth-context";
import { FamilyProvider } from "./src/family/family-context";
import { RootNavigator } from "./src/navigation/root-navigator";
import { colors } from "./src/theme/colors";

enableScreens();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <FamilyProvider key={user?.id ?? "guest"} enabled={Boolean(user)}>
      <RootNavigator />
    </FamilyProvider>
  );
}
