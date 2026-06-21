import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppInput } from "../../components/app-input";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateFixedExpensePayment } from "../../features/fixed-expenses/mutations";
import { useFixedExpense } from "../../features/fixed-expenses/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { createRequestId } from "../../utils/request-id";
import { formatDateKeyKorean, isValidDateKey, toNumber } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FixedExpensePayment">;

interface Attempt {
  requestId: string;
  paidAt: string;
  dueDate: string;
  amount: string;
  note: string;
}

export function FixedExpensePaymentScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const fixedExpenseQuery = useFixedExpense(selectedFamilyId, route.params.fixedExpenseId);
  const fixedExpense = fixedExpenseQuery.data?.fixedExpense;
  const dueDate = route.params.dueDate;
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useCreateFixedExpensePayment(route.params.fixedExpenseId);
  const amountValue = amount || (fixedExpense?.amount ? String(fixedExpense.amount) : "");
  const snapshotKey = useMemo(() => `${dueDate}|${amountValue.trim()}|${note.trim()}`, [amountValue, dueDate, note]);

  const submit = () => {
    const parsedAmount = toNumber(amountValue);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage("고정지출 금액을 확인해 주세요.");
      return;
    }
    if (!isValidDateKey(dueDate)) {
      setMessage("고정지출 납부 예정일을 확인해 주세요.");
      return;
    }
    const nextAttempt =
      attempt && `${attempt.dueDate}|${attempt.amount}|${attempt.note}` === snapshotKey
        ? attempt
        : { requestId: createRequestId(), paidAt: new Date().toISOString(), dueDate, amount: amountValue.trim(), note: note.trim() };
    setAttempt(nextAttempt);
    setMessage(null);
    mutation.mutate(
      {
        requestId: nextAttempt.requestId,
        dueDate: nextAttempt.dueDate,
        paidAt: nextAttempt.paidAt,
        amount: parsedAmount,
        currency: fixedExpense?.currency ?? "KRW",
        note: nextAttempt.note || null,
      },
      {
        onSuccess: async () => {
          setAttempt(null);
          setMessage("납부와 가계부 기록을 함께 남겼어요.");
          await invalidateAfterPayment(queryClient, selectedFamilyId);
          Alert.alert("납부 완료", "납부와 가계부 기록을 함께 남겼어요.");
          navigation.goBack();
        },
        onError: (error) => setMessage(error.message),
      },
    );
  };

  if (fixedExpenseQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="고정지출을 불러오고 있어요." />
      </Screen>
    );
  }

  if (fixedExpenseQuery.error || !fixedExpense) {
    return (
      <Screen>
        <ErrorState message={fixedExpenseQuery.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void fixedExpenseQuery.refetch()} />
      </Screen>
    );
  }

  if (!isValidDateKey(dueDate)) {
    return (
      <Screen>
        <ErrorState message="납부할 예정일은 가족 캘린더에서 선택해 주세요." />
        <AppButton title="뒤로 가기" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>{fixedExpense.title} 납부</Text>
        <Text style={screenStyles.subtitle}>납부와 가계부 기록을 함께 남겨요.</Text>
      </View>
      <Text style={screenStyles.cardText}>납부 예정일: {formatDateKeyKorean(dueDate)}</Text>
      <AppInput label="금액" value={amountValue} onChangeText={setAmount} keyboardType="numeric" />
      <AppInput label="메모" value={note} onChangeText={setNote} placeholder="선택 입력" />
      {message ? <Text style={message.includes("함께 남겼") ? screenStyles.cardText : screenStyles.errorText}>{message}</Text> : null}
      <AppButton title="납부했어요" onPress={submit} loading={mutation.isPending} disabled={mutation.isPending} />
    </Screen>
  );
}

async function invalidateAfterPayment(queryClient: ReturnType<typeof useQueryClient>, familyId?: string | null) {
  if (!familyId) return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "fixedExpenses"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "fixedExpense"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "calendar"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "accountbook"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "home"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["familyScope", familyId, "feed"] }),
  ]);
}
