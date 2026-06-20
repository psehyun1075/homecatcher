import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useTodos } from "../../features/todos/queries";
import type { Todo } from "../../features/todos/types";
import type { TodosStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { formatDateTime, todayRangeInSeoul } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<TodosStackParamList, "TodoList">;
type Filter = "today" | "scheduled" | "all";

export function TodoListScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const [filter, setFilter] = useState<Filter>("today");
  const params = useMemo(() => {
    if (filter === "today") return todayRangeInSeoul();
    if (filter === "scheduled") return { completed: false };
    return {};
  }, [filter]);
  const query = useTodos(selectedFamilyId, params);
  const todos = query.data?.todos ?? [];

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="할 일을 불러오고 있어요." />
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
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={todos}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={screenStyles.title}>할 일(Todo)</Text>
          <View style={styles.filters}>
            {(["today", "scheduled", "all"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${labelForFilter(value)} 보기`}
                onPress={() => setFilter(value)}
                style={[styles.filterButton, filter === value ? styles.filterButtonActive : null]}
              >
                <Text style={[styles.filterText, filter === value ? styles.filterTextActive : null]}>{labelForFilter(value)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title={filter === "today" ? "오늘은 급하게 챙길 할 일이 없어요." : "아직 표시할 할 일이 없어요."}
          message="템플릿으로 만든 할 일이 있으면 여기에 보여요."
        />
      }
      renderItem={({ item }) => <TodoCard todo={item} onPress={() => navigation.navigate("TodoDetail", { todoId: item.id })} />}
    />
  );
}

function labelForFilter(filter: Filter) {
  if (filter === "today") return "오늘";
  if (filter === "scheduled") return "예정";
  return "전체";
}

function TodoCard({ todo, onPress }: { todo: Todo; onPress: () => void }) {
  const repeating = todo.schedule && todo.schedule.scheduleType !== "ONCE";

  return (
    <AppCard onPress={onPress} accessibilityLabel={`${todo.title} 상세 보기`}>
      <Text style={screenStyles.cardTitle}>{todo.title}</Text>
      <Text style={screenStyles.cardText}>{todo.category ?? "카테고리 없음"}</Text>
      <Text style={screenStyles.cardText}>실행 담당: {todo.assigneeMember?.displayName ?? "가족 누구나 할 수 있어요."}</Text>
      <Text style={screenStyles.cardText}>기획 담당: {todo.plannerMember?.displayName ?? "정해지지 않았어요."}</Text>
      <Text style={screenStyles.cardText}>다음 예정: {formatDateTime(todo.nextDueAt)}</Text>
      <Text style={screenStyles.cardText}>{repeating ? "반복 할 일이에요." : todo.completedAt ? "완료된 할 일이에요." : "한 번 하면 끝나요."}</Text>
      {todo.estimatedMinutes ? <Text style={screenStyles.cardText}>예상 {todo.estimatedMinutes}분</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.xl },
  header: { gap: spacing.md },
  filters: { flexDirection: "row", gap: spacing.sm },
  filterButton: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  filterTextActive: {
    color: colors.white,
  },
});
