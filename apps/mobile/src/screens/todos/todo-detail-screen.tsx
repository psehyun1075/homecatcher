import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useTodo, useTodoCompletions } from "../../features/todos/queries";
import type { TodosStackParamList } from "../../navigation/types";
import { formatDateTime } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<TodosStackParamList, "TodoDetail">;

export function TodoDetailScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const todoQuery = useTodo(selectedFamilyId, route.params.todoId);
  const completionsQuery = useTodoCompletions(selectedFamilyId, route.params.todoId);

  if (todoQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="할 일을 불러오고 있어요." />
      </Screen>
    );
  }

  if (todoQuery.error || !todoQuery.data) {
    return (
      <Screen>
        <ErrorState message={todoQuery.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void todoQuery.refetch()} />
        <AppButton title="목록으로 돌아가기" onPress={() => navigation.goBack()} variant="secondary" />
      </Screen>
    );
  }

  const todo = todoQuery.data.todo;
  const isOnceCompleted = (!todo.schedule || todo.schedule.scheduleType === "ONCE") && Boolean(todo.completedAt);
  const completions = completionsQuery.data?.completions ?? [];

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>{todo.title}</Text>
        {todo.description ? <Text style={screenStyles.subtitle}>{todo.description}</Text> : null}
        <Text style={screenStyles.cardText}>카테고리: {todo.category ?? "없음"}</Text>
        <Text style={screenStyles.cardText}>우선순위: {todo.priority ?? "없음"}</Text>
        <Text style={screenStyles.cardText}>예상 소요: {todo.estimatedMinutes ? `${todo.estimatedMinutes}분` : "없음"}</Text>
        <Text style={screenStyles.cardText}>기획 담당: {todo.plannerMember?.displayName ?? "정해지지 않았어요."}</Text>
        <Text style={screenStyles.cardText}>실행 담당: {todo.assigneeMember?.displayName ?? "가족 누구나 할 수 있어요."}</Text>
        <Text style={screenStyles.cardText}>반복 주기: {todo.schedule?.scheduleType ?? "ONCE"}</Text>
        <Text style={screenStyles.cardText}>다음 예정: {formatDateTime(todo.nextDueAt)}</Text>
        <Text style={screenStyles.cardText}>완료 횟수: {todo.completionCount}</Text>
        {todo.latestCompletion ? <Text style={screenStyles.cardText}>최근 완료: {formatDateTime(todo.latestCompletion.completedAt)}</Text> : null}
        {isOnceCompleted ? (
          <Text style={screenStyles.cardText}>최종 완료된 할 일이에요.</Text>
        ) : (
          <AppButton title="완료했어요" onPress={() => navigation.navigate("TodoComplete", { todoId: todo.id })} />
        )}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>최근 완료 기록</Text>
        {completions.length === 0 ? (
          <Text style={screenStyles.cardText}>아직 완료 기록이 없어요.</Text>
        ) : (
          completions.slice(0, 5).map((completion) => (
            <Text key={completion.id} style={screenStyles.cardText}>
              {formatDateTime(completion.completedAt)} · {completion.completedByMember?.displayName ?? "가족"}
            </Text>
          ))
        )}
      </AppCard>
    </Screen>
  );
}
