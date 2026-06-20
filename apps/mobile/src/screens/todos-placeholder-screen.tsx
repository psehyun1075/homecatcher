import { Text } from "react-native";

import { AppCard } from "../components/app-card";
import { Screen } from "../components/screen";
import { screenStyles } from "./styles";

export function TodosPlaceholderScreen() {
  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>할 일(Todo)</Text>
        <Text style={screenStyles.subtitle}>다음 단계에서 할 일 목록과 완료 흐름을 연결할게요.</Text>
      </AppCard>
    </Screen>
  );
}
