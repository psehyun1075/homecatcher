import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../auth/auth-context";
import { useFamily } from "../family/family-context";
import { SplashScreen } from "../screens/splash-screen";
import { AuthNavigator } from "./auth-navigator";
import { MainTabNavigator } from "./main-tab-navigator";
import { FamilyOnboardingNavigator, TemplateOnboardingNavigator } from "./onboarding-navigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isBootstrapping } = useAuth();
  const { families, selectedFamily, isLoadingFamilies, isSwitchingFamily, templateOnboardingFamilyId } = useFamily();

  if (isBootstrapping || (user && (isLoadingFamilies || isSwitchingFamily))) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : templateOnboardingFamilyId ? (
          <Stack.Screen name="Onboarding">{() => <TemplateOnboardingNavigator familyId={templateOnboardingFamilyId} />}</Stack.Screen>
        ) : !selectedFamily || families.length === 0 ? (
          <Stack.Screen name="Onboarding">
            {() => <FamilyOnboardingNavigator initialRouteName={families.length > 0 ? "FamilySelect" : "FamilyStart"} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
