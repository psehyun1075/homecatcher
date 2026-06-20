import { Text } from "react-native";

import { AppCard } from "../components/app-card";
import { Screen } from "../components/screen";
import { screenStyles } from "./styles";

export function HouseholdItemsPlaceholderScreen() {
  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>생필품</Text>
        <Text style={screenStyles.subtitle}>다음 단계에서 생필품을 함께 연결할게요.</Text>
      </AppCard>
    </Screen>
  );
}
