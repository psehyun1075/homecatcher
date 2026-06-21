import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useFixedExpense, useFixedExpensePayments } from "../../features/fixed-expenses/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { formatDate, formatDateKeyKorean, formatDateTime, formatMoney, isValidDateKey } from "../../utils/format";
import { screenStyles } from "../styles";
import { recurrenceLabel } from "./fixed-expense-list-screen";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FixedExpenseDetail">;

export function FixedExpenseDetailScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useFixedExpense(selectedFamilyId, route.params.fixedExpenseId);
  const paymentsQuery = useFixedExpensePayments(selectedFamilyId, route.params.fixedExpenseId);
  const fixedExpense = query.data?.fixedExpense;
  const payments = paymentsQuery.data?.payments ?? [];
  const dueDate = isValidDateKey(route.params.dueDate) ? route.params.dueDate : undefined;
  const isPaidOccurrence = route.params.occurrenceStatus === "PAID";

  return (
    <Screen>
      {query.isLoading ? (
        <LoadingState message="고정지출을 불러오고 있어요." />
      ) : query.error ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : fixedExpense ? (
        <>
          <View>
            <Text style={screenStyles.title}>{fixedExpense.title}</Text>
            <Text style={screenStyles.subtitle}>{recurrenceLabel(fixedExpense)}</Text>
          </View>
          <AppCard>
            <Text style={screenStyles.cardTitle}>납부 정보</Text>
            <Text style={screenStyles.cardText}>{formatMoney(fixedExpense.amount, fixedExpense.currency)}</Text>
            {dueDate ? <Text style={screenStyles.cardText}>선택한 납부 예정일: {formatDateKeyKorean(dueDate)}</Text> : null}
            {isPaidOccurrence ? <Text style={screenStyles.cardText}>납부 완료</Text> : null}
            <Text style={screenStyles.cardText}>시간대: {fixedExpense.timezone}</Text>
            {fixedExpense.memo ? <Text style={screenStyles.cardText}>{fixedExpense.memo}</Text> : null}
            {fixedExpense.isActive && dueDate && !isPaidOccurrence ? (
              <AppButton title="납부했어요" onPress={() => navigation.navigate("FixedExpensePayment", { fixedExpenseId: fixedExpense.id, dueDate, occurrenceKey: route.params.occurrenceKey })} />
            ) : !dueDate ? (
              <Text style={screenStyles.cardText}>납부할 예정일은 가족 캘린더에서 선택해 주세요.</Text>
            ) : !isPaidOccurrence ? (
              <Text style={screenStyles.cardText}>현재 사용할 수 없는 고정지출이에요.</Text>
            ) : null}
          </AppCard>
          <AppCard>
            <Text style={screenStyles.cardTitle}>알림 규칙</Text>
            {fixedExpense.reminders.length === 0 ? (
              <EmptyState title="등록된 알림 규칙이 없어요." />
            ) : (
              fixedExpense.reminders.map((reminder) => (
                <Text key={reminder.id} style={screenStyles.cardText}>
                  {reminder.daysBefore === 0 ? "당일" : `${reminder.daysBefore}일 전`} {reminder.remindTime}
                </Text>
              ))
            )}
          </AppCard>
          <AppCard>
            <Text style={screenStyles.cardTitle}>최근 납부 기록</Text>
            {paymentsQuery.isLoading ? (
              <LoadingState message="납부 기록을 불러오고 있어요." />
            ) : payments.length === 0 ? (
              <EmptyState title="아직 납부 기록이 없어요." />
            ) : (
              payments.slice(0, 5).map((payment) => (
                <Text key={payment.id} style={screenStyles.cardText}>
                  {formatDate(payment.dueDate)} · {formatMoney(payment.amount, payment.currency)} · {formatDateTime(payment.paidAt)}
                </Text>
              ))
            )}
          </AppCard>
        </>
      ) : (
        <ErrorState message="정보를 찾을 수 없어요." />
      )}
    </Screen>
  );
}
