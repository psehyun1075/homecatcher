import { FlatList, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import type { FixedExpense } from "../../features/fixed-expenses/types";
import { useFixedExpenses } from "../../features/fixed-expenses/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { formatMoney } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FixedExpenseList">;

export function FixedExpenseListScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useFixedExpenses(selectedFamilyId);
  const expenses = query.data?.fixedExpenses ?? [];

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="고정지출을 불러오고 있어요." />
      </Screen>
    );
  }

  if (query.error) {
    return (
      <Screen>
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={screenStyles.title}>고정지출 알림</Text>
      <Text style={screenStyles.subtitle}>월세, 관리비처럼 돈 나가는 날을 함께 챙겨요.</Text>
      <AppButton title="고정지출 등록" onPress={() => navigation.navigate("FixedExpenseCreate")} />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primaryDark} />}
        ListEmptyComponent={
          <View>
            <EmptyState title="아직 등록된 고정지출이 없어요." />
            <AppButton title="고정지출 등록" onPress={() => navigation.navigate("FixedExpenseCreate")} variant="secondary" />
          </View>
        }
        renderItem={({ item }) => <FixedExpenseCard fixedExpense={item} onPress={() => navigation.navigate("FixedExpenseDetail", { fixedExpenseId: item.id })} />}
      />
    </Screen>
  );
}

function FixedExpenseCard({ fixedExpense, onPress }: { fixedExpense: FixedExpense; onPress: () => void }) {
  return (
    <AppCard>
      <Text style={screenStyles.cardTitle}>{fixedExpense.title}</Text>
      <Text style={screenStyles.cardText}>{recurrenceLabel(fixedExpense)}</Text>
      <Text style={screenStyles.cardText}>{formatMoney(fixedExpense.amount, fixedExpense.currency)}</Text>
      <Text style={screenStyles.cardText}>{fixedExpense.isActive ? "알림 사용 중" : "지금은 사용하지 않아요."}</Text>
      <AppButton title="자세히 보기" variant="secondary" onPress={onPress} />
    </AppCard>
  );
}

export function recurrenceLabel(fixedExpense: FixedExpense) {
  if (fixedExpense.recurrenceType === "MONTHLY") return `매월 ${fixedExpense.dayOfMonth ?? "정해진"}일`;
  if (fixedExpense.recurrenceType === "WEEKLY") return `매주 ${weekdayLabel(fixedExpense.dayOfWeek)}`;
  if (fixedExpense.recurrenceType === "YEARLY") return "매년";
  if (fixedExpense.recurrenceType === "INTERVAL_DAYS") return `${fixedExpense.intervalValue ?? 1}일마다`;
  return "한 번";
}

function weekdayLabel(day?: number | null) {
  return ["일", "월", "화", "수", "목", "금", "토"][day ?? 0] + "요일";
}
