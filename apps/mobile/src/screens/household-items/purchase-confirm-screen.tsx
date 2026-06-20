import { useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError } from "../../api/client";
import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateItemPurchase } from "../../features/household-items/mutations";
import { householdItemKeys, useReorderPreview } from "../../features/household-items/queries";
import type { HouseholdItemsStackParamList } from "../../navigation/types";
import { createRequestId } from "../../utils/request-id";
import { formatMoney, toNumber } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<HouseholdItemsStackParamList, "PurchaseConfirm">;

export function PurchaseConfirmScreen({ navigation, route }: Props) {
  const { selectedFamily } = useFamily();
  const queryClient = useQueryClient();
  const previewQuery = useReorderPreview(selectedFamily?.id, route.params.itemId);
  const mutation = useCreateItemPurchase(route.params.itemId);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [stockAfterPurchase, setStockAfterPurchase] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(createRequestId);
  const [message, setMessage] = useState<string | null>(null);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [success, setSuccess] = useState(false);

  const suggestedAmount = useMemo(() => {
    const preview = previewQuery.data?.reorderPreview;
    return preview?.previewPrice ?? preview?.recentPurchaseAmount ?? null;
  }, [previewQuery.data]);

  useEffect(() => {
    if (suggestedAmount && !unitPrice && !totalAmount) {
      setUnitPrice(String(suggestedAmount));
      setTotalAmount(String(suggestedAmount));
    }
  }, [suggestedAmount, totalAmount, unitPrice]);

  const resetRequestId = () => {
    setRequestId(createRequestId());
    setNeedsOverride(false);
  };

  const submit = async (confirmRuleOverride = false) => {
    const total = toNumber(totalAmount);
    if (!total || total <= 0) {
      setMessage("구매 금액을 확인해 주세요.");
      return;
    }
    setMessage(null);
    try {
      const preview = previewQuery.data?.reorderPreview;
      await mutation.mutateAsync({
        requestId,
        productLinkId: preview?.primaryProductLink?.id ?? null,
        quantity: toNumber(quantity),
        unitPrice: toNumber(unitPrice),
        totalAmount: total,
        currency: preview?.primaryProductLink?.currency ?? "KRW",
        stockAfterPurchase: toNumber(stockAfterPurchase),
        note: note.trim() || undefined,
        confirmRuleOverride,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: householdItemKeys.list(selectedFamily!.id) }),
        queryClient.invalidateQueries({ queryKey: householdItemKeys.detail(selectedFamily!.id, route.params.itemId) }),
        queryClient.invalidateQueries({ queryKey: householdItemKeys.purchases(selectedFamily!.id, route.params.itemId) }),
        queryClient.invalidateQueries({ queryKey: householdItemKeys.reorderPreview(selectedFamily!.id, route.params.itemId) }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamily!.id, "calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamily!.id, "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamily!.id, "feed"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamily!.id, "home"] }),
        queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamily!.id, "accountbook"] }),
      ]);
      setMessage("주문과 가계부 기록을 함께 남겼어요.");
      setRequestId(createRequestId());
      setSuccess(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setNeedsOverride(true);
        setMessage(caught.message);
        return;
      }
      setMessage(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    }
  };

  if (previewQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="구매 정보를 준비하고 있어요." />
      </Screen>
    );
  }

  if (previewQuery.error) {
    return (
      <Screen>
        <ErrorState message={previewQuery.error.message} onRetry={() => void previewQuery.refetch()} />
      </Screen>
    );
  }

  const canOverride = selectedFamily?.role === "OWNER" || selectedFamily?.role === "ADMIN";

  if (success) {
    return (
      <Screen>
        <AppCard>
          <Text style={screenStyles.title}>기록했어요</Text>
          <Text style={screenStyles.subtitle}>주문과 가계부 기록을 함께 남겼어요.</Text>
          <AppButton title="생필품 상세로 돌아가기" onPress={() => navigation.navigate("HouseholdItemDetail", { itemId: route.params.itemId })} />
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.title}>주문했어요</Text>
        <Text style={screenStyles.subtitle}>실제 쇼핑몰에서 결제한 뒤 금액만 확인해 주세요.</Text>
        {suggestedAmount ? <Text style={screenStyles.cardText}>제안 금액: {formatMoney(suggestedAmount)}</Text> : null}
        <AppInput label="수량" value={quantity} onChangeText={(value) => { setQuantity(value); resetRequestId(); }} keyboardType="numeric" />
        <AppInput label="개당 가격" value={unitPrice} onChangeText={(value) => { setUnitPrice(value); resetRequestId(); }} keyboardType="numeric" />
        <AppInput label="총 금액" value={totalAmount} onChangeText={(value) => { setTotalAmount(value); resetRequestId(); }} keyboardType="numeric" />
        <AppInput label="구매 후 재고" value={stockAfterPurchase} onChangeText={(value) => { setStockAfterPurchase(value); resetRequestId(); }} keyboardType="numeric" />
        <AppInput label="메모" value={note} onChangeText={(value) => { setNote(value); resetRequestId(); }} multiline />
        {message ? <Text style={needsOverride ? screenStyles.errorText : screenStyles.cardText}>{message}</Text> : null}
        <AppButton title="주문과 가계부 기록 남기기" onPress={() => void submit(false)} loading={mutation.isPending} />
        {needsOverride && canOverride ? (
          <AppButton title="확인하고 기록하기" onPress={() => void submit(true)} loading={mutation.isPending} variant="secondary" />
        ) : null}
      </AppCard>
    </Screen>
  );
}
