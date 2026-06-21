import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateFixedExpense } from "../../features/fixed-expenses/mutations";
import type { FixedExpenseRecurrenceType } from "../../features/fixed-expenses/types";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { dateKeyInSeoul, isValidDateKey, toNumber } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "FixedExpenseCreate">;

const recurrenceOptions: Array<{ type: FixedExpenseRecurrenceType; label: string }> = [
  { type: "ONCE", label: "한 번" },
  { type: "WEEKLY", label: "매주" },
  { type: "MONTHLY", label: "매월" },
  { type: "YEARLY", label: "매년" },
  { type: "INTERVAL_DAYS", label: "며칠마다" },
];

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function FixedExpenseCreateScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const today = useMemo(() => dateKeyInSeoul(), []);
  const todayDay = Number(today.slice(8, 10));
  const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const mutation = useCreateFixedExpense(selectedFamilyId ?? "");
  const submittedRef = useRef(false);

  const [title, setTitle] = useState(route.params?.initialTitle ?? "");
  const [amount, setAmount] = useState(route.params?.initialAmount ?? "");
  const [recurrenceType, setRecurrenceType] = useState<FixedExpenseRecurrenceType>("MONTHLY");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [dayOfMonth, setDayOfMonth] = useState(String(todayDay));
  const [dayOfWeek, setDayOfWeek] = useState(todayWeekday);
  const [intervalValue, setIntervalValue] = useState("30");
  const [memo, setMemo] = useState("");
  const [remindThreeDaysBefore, setRemindThreeDaysBefore] = useState(true);
  const [remindSameDay, setRemindSameDay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (mutation.isPending || submittedRef.current) return;
    if (!selectedFamilyId) return;
    const trimmedTitle = title.trim();
    const parsedAmount = toNumber(amount);
    const parsedDayOfMonth = Number(dayOfMonth);
    const parsedInterval = Number(intervalValue);

    if (!trimmedTitle) {
      setError("고정지출 이름을 입력해 주세요.");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError("고정지출 금액을 확인해 주세요.");
      return;
    }
    if (!isValidDateKey(startDate) || (endDate.trim() && !isValidDateKey(endDate.trim()))) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }
    if (endDate.trim() && endDate.trim() < startDate) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }
    if ((recurrenceType === "MONTHLY" || recurrenceType === "YEARLY") && (!Number.isInteger(parsedDayOfMonth) || parsedDayOfMonth < 1 || parsedDayOfMonth > 31)) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }
    if (recurrenceType === "WEEKLY" && (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }
    if (recurrenceType === "INTERVAL_DAYS" && (!Number.isInteger(parsedInterval) || parsedInterval <= 0)) {
      setError("반복 날짜를 확인해 주세요.");
      return;
    }

    const reminders = [
      { daysBefore: 3, remindTime: "09:00", enabled: remindThreeDaysBefore },
      { daysBefore: 0, remindTime: "09:00", enabled: remindSameDay },
    ];

    setError(null);
    submittedRef.current = true;
    setSubmitted(true);

    let response: Awaited<ReturnType<typeof mutation.mutateAsync>>;
    try {
      response = await mutation.mutateAsync({
        title: trimmedTitle,
        amount: parsedAmount,
        currency: "KRW",
        recurrenceType,
        startDate,
        endDate: endDate.trim() || null,
        dueTime,
        timezone: "Asia/Seoul",
        memo: memo.trim() || null,
        dayOfMonth: recurrenceType === "MONTHLY" || recurrenceType === "YEARLY" ? parsedDayOfMonth : null,
        dayOfWeek: recurrenceType === "WEEKLY" ? dayOfWeek : null,
        intervalValue: recurrenceType === "INTERVAL_DAYS" ? parsedInterval : null,
        reminders,
      });
    } catch (submitError) {
      submittedRef.current = false;
      setSubmitted(false);
      setError(submitError instanceof Error ? submitError.message : "잠시 연결이 어려워요.");
      return;
    }

    const fixedExpenseId = response.fixedExpense.id;
    queryClient.setQueryData(["familyScope", selectedFamilyId, "fixedExpense", fixedExpenseId], response);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "fixedExpenses"] }),
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "fixedExpense", fixedExpenseId] }),
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "home"] }),
      queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "notifications"] }),
    ]);
    navigation.replace("FixedExpenseDetail", { fixedExpenseId });
    Alert.alert("고정지출 알림을 준비했어요.");
  };

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>고정지출 등록</Text>
        <Text style={screenStyles.subtitle}>월세, 관리비처럼 반복해서 챙길 지출을 가족 캘린더에 준비해요.</Text>
      </View>

      <AppInput label="이름" value={title} onChangeText={setTitle} placeholder="월세" />
      <AppInput label="금액" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="850000" />

      <Text style={screenStyles.cardTitle}>반복 유형</Text>
      <View style={styles.optionRow}>
        {recurrenceOptions.map((option) => (
          <OptionChip key={option.type} label={option.label} selected={recurrenceType === option.type} onPress={() => setRecurrenceType(option.type)} />
        ))}
      </View>

      <AppInput label={recurrenceType === "ONCE" ? "납부일" : "시작일"} value={startDate} onChangeText={setStartDate} placeholder="2026-07-25" />
      <AppInput label="종료일" value={endDate} onChangeText={setEndDate} placeholder="선택 입력" />
      <AppInput label="납부 시간" value={dueTime} onChangeText={setDueTime} placeholder="09:00" />

      {recurrenceType === "WEEKLY" ? (
        <>
          <Text style={screenStyles.cardTitle}>요일</Text>
          <View style={styles.optionRow}>
            {weekdays.map((label, index) => (
              <OptionChip key={label} label={label} selected={dayOfWeek === index} onPress={() => setDayOfWeek(index)} />
            ))}
          </View>
        </>
      ) : null}

      {recurrenceType === "MONTHLY" || recurrenceType === "YEARLY" ? (
        <AppInput label={recurrenceType === "MONTHLY" ? "매월 납부일" : "매년 납부일"} value={dayOfMonth} onChangeText={setDayOfMonth} keyboardType="numeric" placeholder="25" />
      ) : null}

      {recurrenceType === "INTERVAL_DAYS" ? <AppInput label="반복 일수" value={intervalValue} onChangeText={setIntervalValue} keyboardType="numeric" placeholder="30" /> : null}

      <AppInput label="메모" value={memo} onChangeText={setMemo} placeholder="선택 입력" />

      <AppCard>
        <Text style={screenStyles.cardTitle}>알림 규칙</Text>
        <ReminderToggle label="3일 전 09:00" selected={remindThreeDaysBefore} onPress={() => setRemindThreeDaysBefore((value) => !value)} />
        <ReminderToggle label="당일 09:00" selected={remindSameDay} onPress={() => setRemindSameDay((value) => !value)} />
      </AppCard>

      {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
      <AppButton title={submitted ? "고정지출 준비 중..." : "고정지출 등록"} onPress={submit} loading={mutation.isPending} disabled={mutation.isPending || submitted} />
    </Screen>
  );
}

function OptionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택`} onPress={onPress} style={[styles.chip, selected ? styles.selectedChip : null]}>
      <Text style={[styles.chipText, selected ? styles.selectedChipText : null]}>{label}</Text>
    </Pressable>
  );
}

function ReminderToggle({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${label} 알림`} onPress={onPress} style={styles.reminderRow}>
      <View style={[styles.checkbox, selected ? styles.checkedBox : null]} />
      <Text style={screenStyles.cardText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectedChip: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
  },
  selectedChipText: {
    color: colors.primaryDark,
  },
  reminderRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkedBox: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary,
  },
});
