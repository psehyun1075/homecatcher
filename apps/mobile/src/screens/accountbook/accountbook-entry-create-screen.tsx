import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateAccountEntry } from "../../features/accountbook/mutations";
import { useAccountCategories } from "../../features/accountbook/queries";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { dateKeyInSeoul, toDateTimeOffset, toNumber } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "AccountbookEntryCreate">;

export function AccountbookEntryCreateScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const categoriesQuery = useAccountCategories(selectedFamilyId);
  const mutation = useCreateAccountEntry(selectedFamilyId ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [occurredDate, setOccurredDate] = useState(route.params?.month ? `${route.params.month}-01` : dateKeyInSeoul());
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedCategory = (categoriesQuery.data?.categories ?? []).find((category) => category.id === categoryId);
  const selectedFixedExpenseCategory = selectedCategory?.code === "FIXED_EXPENSE";

  const submit = () => {
    const parsedAmount = toNumber(amount);
    if (!title.trim()) {
      setError("지출 제목을 입력해 주세요.");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError("구매 금액을 확인해 주세요.");
      return;
    }
    if (!categoryId) {
      setError("카테고리를 선택해 주세요.");
      return;
    }
    if (!isDate(occurredDate)) {
      setError("날짜를 확인해 주세요.");
      return;
    }
    setError(null);
    mutation.mutate(
      {
        title: title.trim(),
        amount: parsedAmount,
        categoryId,
        entryType: "EXPENSE",
        currency: "KRW",
        occurredAt: toDateTimeOffset(occurredDate, "12:00"),
        memo: memo.trim() || undefined,
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "accountbook"] }),
            queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "calendar"] }),
            queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "home"] }),
          ]);
          Alert.alert("가계부에 기록했어요", "가계부에 기록했어요.");
          navigation.goBack();
        },
        onError: (submitError) => setError(submitError.message),
      },
    );
  };

  if (categoriesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="카테고리를 불러오고 있어요." />
      </Screen>
    );
  }

  if (categoriesQuery.error) {
    return (
      <Screen>
        <ErrorState message={categoriesQuery.error.message} onRetry={() => void categoriesQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>지출 기록하기</Text>
        <Text style={screenStyles.subtitle}>직접 쓴 생활비만 간단히 남겨요.</Text>
      </View>
      <AppInput label="제목" value={title} onChangeText={setTitle} placeholder="장보기" />
      <AppInput label="금액" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Text style={screenStyles.cardTitle}>카테고리</Text>
      <View style={styles.categoryRow}>
        {(categoriesQuery.data?.categories ?? []).map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`${category.name} 선택`}
            onPress={() => setCategoryId(category.id)}
            style={[styles.category, categoryId === category.id ? styles.selectedCategory : null]}
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </Pressable>
        ))}
      </View>
      {selectedFixedExpenseCategory ? (
        <AppCard>
          <Text style={screenStyles.cardText}>
            이미 나간 돈을 가계부에 기록해요.{"\n"}
            매달 반복되는 지출을 미리 챙기려면 고정지출 알림에 등록해 주세요.
          </Text>
          <AppButton
            title="고정지출 알림으로 등록하기"
            variant="secondary"
            onPress={() =>
              navigation.navigate("FixedExpenseCreate", {
                initialTitle: title.trim() || undefined,
                initialAmount: amount.trim() || undefined,
              })
            }
          />
        </AppCard>
      ) : null}
      <AppInput label="발생일" value={occurredDate} onChangeText={setOccurredDate} placeholder="2026-07-10" />
      <AppInput label="메모" value={memo} onChangeText={setMemo} placeholder="선택 입력" />
      {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
      <AppButton title="가계부에 기록" onPress={submit} loading={mutation.isPending} disabled={mutation.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  category: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectedCategory: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accent,
  },
  categoryText: {
    color: colors.text,
    fontWeight: "700",
  },
});

function isDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
