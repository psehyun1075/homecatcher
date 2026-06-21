import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useAccountCategories, useAccountEntries } from "../../features/accountbook/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { formatDate, formatMoney, monthKeyInSeoul, monthLabel, shiftMonth } from "../../utils/format";
import { screenStyles } from "../styles";
import { useState } from "react";

type Props = NativeStackScreenProps<MyHomeStackParamList, "AccountbookEntries">;

export function AccountbookEntriesScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const [month, setMonth] = useState(route.params?.month ?? monthKeyInSeoul());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const categoriesQuery = useAccountCategories(selectedFamilyId);
  const entriesQuery = useAccountEntries(selectedFamilyId, { month, categoryId, limit: 50 });
  const entries = entriesQuery.data?.entries ?? [];

  if (entriesQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="생활비 내역을 불러오고 있어요." />
      </Screen>
    );
  }

  if (entriesQuery.error) {
    return (
      <Screen>
        <ErrorState message={entriesQuery.error.message} onRetry={() => void entriesQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ gap: spacing.md }}>
        <Text style={screenStyles.title}>생활비 내역</Text>
        <View style={screenStyles.row}>
          <AppButton title="이전" variant="secondary" onPress={() => setMonth((value) => shiftMonth(value, -1))} />
          <Text style={screenStyles.cardTitle}>{monthLabel(month)}</Text>
          <AppButton title="다음" variant="secondary" onPress={() => setMonth((value) => shiftMonth(value, 1))} />
        </View>
        <View style={styles.filterRow}>
          <Pressable accessibilityRole="button" onPress={() => setCategoryId(undefined)} style={[styles.filter, !categoryId ? styles.selectedFilter : null]}>
            <Text style={styles.filterText}>전체</Text>
          </Pressable>
          {(categoriesQuery.data?.categories ?? []).map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => setCategoryId(category.id)}
              style={[styles.filter, categoryId === category.id ? styles.selectedFilter : null]}
            >
              <Text style={styles.filterText}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={entriesQuery.isRefetching} onRefresh={() => void entriesQuery.refetch()} tintColor={colors.primaryDark} />}
        ListEmptyComponent={<EmptyState title="이 달에는 아직 기록된 생활비가 없어요." />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={screenStyles.cardTitle}>{item.title}</Text>
            <Text style={screenStyles.cardText}>
              {formatDate(item.occurredAt)} · {item.categoryName}
            </Text>
            <Text style={screenStyles.cardText}>{formatMoney(item.amount, item.currency)}</Text>
            {item.itemPurchaseLogId ? <Text style={screenStyles.cardText}>생필품 구매와 연결됐어요.</Text> : null}
          </AppCard>
        )}
      />
      <AppButton title="지출 기록하기" onPress={() => navigation.navigate("AccountbookEntryCreate", { month })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filter: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectedFilter: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.text,
    fontWeight: "700",
  },
});
