import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { Screen } from "../components/screen";
import type { OnboardingStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<OnboardingStackParamList, "FamilyStart">;

export function FamilyStartScreen({ navigation }: Props) {
  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.eyebrow}>우리집 시작</Text>
        <Text style={screenStyles.title}>우리집 일을 함께 볼 공간을 만들어요.</Text>
        <Text style={screenStyles.subtitle}>가족을 새로 만들거나 초대 코드로 참여할 수 있어요.</Text>
        <AppButton title="우리집 만들기" onPress={() => navigation.navigate("FamilyCreate")} />
        <AppButton title="초대 코드가 있어요" onPress={() => navigation.navigate("InviteJoin")} variant="secondary" />
      </AppCard>
    </Screen>
  );
}
