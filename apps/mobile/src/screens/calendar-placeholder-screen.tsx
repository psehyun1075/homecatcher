import { Text } from "react-native";

import { AppCard } from "../components/app-card";
import { Screen } from "../components/screen";
import { screenStyles } from "./styles";

export function CalendarPlaceholderScreen() {
  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>가족 캘린더</Text>
        <Text style={screenStyles.subtitle}>다음 단계에서 달력형 화면을 연결할게요.</Text>
      </AppCard>
    </Screen>
  );
}
