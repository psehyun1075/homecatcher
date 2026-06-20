import { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError } from "../../api/client";
import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateTodoCompletion } from "../../features/todos/mutations";
import { todoKeys } from "../../features/todos/queries";
import type { TodosStackParamList } from "../../navigation/types";
import { createRequestId } from "../../utils/request-id";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<TodosStackParamList, "TodoComplete">;

interface CompletionAttempt {
  requestId: string;
  completedAt: string;
  noteSnapshot: string | null;
}

function normalizeNote(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function TodoCompleteScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const mutation = useCreateTodoCompletion(route.params.todoId);
  const [note, setNote] = useState("");
  const [attempt, setAttempt] = useState<CompletionAttempt | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (!selectedFamilyId) return;
    setMessage(null);
    const noteSnapshot = normalizeNote(note);
    const currentAttempt =
      attempt && attempt.noteSnapshot === noteSnapshot
        ? attempt
        : {
            requestId: createRequestId(),
            completedAt: new Date().toISOString(),
            noteSnapshot,
          };
    setAttempt(currentAttempt);
    try {
      await mutation.mutateAsync({
        requestId: currentAttempt.requestId,
        completedAt: currentAttempt.completedAt,
        note: currentAttempt.noteSnapshot ?? undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "todos"] }),
        queryClient.invalidateQueries({ queryKey: todoKeys.detail(selectedFamilyId, route.params.todoId) }),
        queryClient.invalidateQueries({ queryKey: todoKeys.completions(selectedFamilyId, route.params.todoId) }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "feed"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "home"] }),
      ]);
      setMessage("완료로 기록했어요. 고마워요!");
      setAttempt(null);
      setSuccess(true);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    }
  };

  if (success) {
    return (
      <Screen>
        <AppCard>
          <Text style={screenStyles.title}>완료로 기록했어요</Text>
          <Text style={screenStyles.subtitle}>고마워요!</Text>
          <AppButton title="할 일 상세로 돌아가기" onPress={() => navigation.navigate("TodoDetail", { todoId: route.params.todoId })} />
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>완료했어요</Text>
        <Text style={screenStyles.subtitle}>누가 맡았든 가족이면 완료로 남길 수 있어요.</Text>
        <AppInput
          label="메모"
          value={note}
          onChangeText={(value) => {
            setNote(value);
            setAttempt(null);
          }}
          placeholder="예: 청소하고 환기했어요."
          multiline
        />
        {message ? <Text style={screenStyles.cardText}>{message}</Text> : null}
        <AppButton title="완료로 기록하기" onPress={submit} loading={mutation.isPending} />
      </AppCard>
    </Screen>
  );
}
