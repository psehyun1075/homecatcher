import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useAccountEntries, useMonthlySummary } from "../../features/accountbook/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { formatDate, formatMoney, monthKeyInSeoul, monthLabel, shiftMonth } from "../../utils/format";
import { screenStyles } from "../styles";
import { useState } from "react";

type Props = NativeStackScreenProps<MyHomeStackParamList, "AccountbookHome">;

export function AccountbookHomeScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const [month, setMonth] = useState(monthKeyInSeoul());
  const summaryQuery = useMonthlySummary(selectedFamilyId, month);
  const entriesQuery = useAccountEntries(selectedFamilyId, { month, limit: 5 });
  const summary = summaryQuery.data;
  const entries = entriesQuery.data?.entries ?? [];

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>가계부</Text>
        <Text style={screenStyles.subtitle}>우리집 생활비를 카테고리별로 확인해요.</Text>
      </View>
      <View style={screenStyles.row}>
        <AppButton title="이전" variant="secondary" onPress={() => setMonth((value) => shiftMonth(value, -1))} />
        <Text style={screenStyles.cardTitle}>{monthLabel(month)}</Text>
        <AppButton title="다음" variant="secondary" onPress={() => setMonth((value) => shiftMonth(value, 1))} />
      </View>
      {summaryQuery.isLoading ? (
        <LoadingState message="가계부 요약을 불러오고 있어요." />
      ) : summaryQuery.error ? (
        <ErrorState message={summaryQuery.error.message} onRetry={() => void summaryQuery.refetch()} />
      ) : (
        <AppCard>
          <Text style={screenStyles.cardTitle}>총 지출</Text>
          <Text style={screenStyles.title}>{formatMoney(summary?.totalExpense ?? 0)}</Text>
          {summary?.categorySummaries.length ? (
            summary.categorySummaries.map((item) => (
              <Text key={item.categoryCode} style={screenStyles.cardText}>
                {item.categoryName} · {formatMoney(item.amount)} · {item.entryCount}건
              </Text>
            ))
          ) : (
            <EmptyState title="이 달에는 아직 기록된 생활비가 없어요." />
          )}
        </AppCard>
      )}
      <AppCard>
        <Text style={screenStyles.cardTitle}>최근 지출</Text>
        {entriesQuery.isLoading ? (
          <LoadingState message="지출 내역을 불러오고 있어요." />
        ) : entriesQuery.error ? (
          <ErrorState message={entriesQuery.error.message} onRetry={() => void entriesQuery.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState title="최근 지출 내역이 없어요." />
        ) : (
          entries.map((entry) => (
            <Text key={entry.id} style={screenStyles.cardText}>
              {formatDate(entry.occurredAt)} · {entry.title} · {formatMoney(entry.amount, entry.currency)}
            </Text>
          ))
        )}
      </AppCard>
      <AppButton title="전체 내역 보기" variant="secondary" onPress={() => navigation.navigate("AccountbookEntries", { month })} />
      <AppButton title="지출 기록하기" onPress={() => navigation.navigate("AccountbookEntryCreate", { month })} />
    </Screen>
  );
}
