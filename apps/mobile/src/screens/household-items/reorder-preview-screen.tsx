import { Linking, Text, View } from "react-native";
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { RemoteImage } from "../../components/remote-image";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useReorderPreview } from "../../features/household-items/queries";
import type { HouseholdItemsStackParamList } from "../../navigation/types";
import { formatDate, formatMoney, isValidUrl } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<HouseholdItemsStackParamList, "ReorderPreview">;

export function ReorderPreviewScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useReorderPreview(selectedFamilyId, route.params.itemId);
  const [openingUrl, setOpeningUrl] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const openProduct = async (url: string | null) => {
    if (openingUrl) return;
    if (!isValidUrl(url)) return;
    setOpeningUrl(true);
    setLinkMessage(null);
    try {
      const canOpen = await Linking.canOpenURL(url!);
      if (!canOpen) {
        setLinkMessage("상품 페이지를 열 수 없어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      await Linking.openURL(url!);
    } catch {
      setLinkMessage("상품 페이지를 열 수 없어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setOpeningUrl(false);
    }
  };

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="재주문 정보를 확인하고 있어요." />
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen>
        <ErrorState message={query.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const preview = query.data.reorderPreview;

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.eyebrow}>재주문</Text>
        <Text style={screenStyles.title}>이 상품으로 주문하면 돼요.</Text>
        <View style={screenStyles.row}>
          <View style={{ flex: 1 }}>
            <Text style={screenStyles.cardTitle}>{preview.productName ?? preview.itemName}</Text>
            <Text style={screenStyles.cardText}>{preview.mallName ?? "쇼핑몰 정보 없음"}</Text>
          </View>
          <RemoteImage uri={preview.productImageUrl} label={`${preview.itemName} 상품 사진`} size={96} />
        </View>
        <Text style={screenStyles.cardText}>상품 가격: {formatMoney(preview.previewPrice, preview.primaryProductLink?.currency ?? "KRW")}</Text>
        <Text style={screenStyles.cardText}>최근 실제 구매 금액: {formatMoney(preview.recentPurchaseAmount)}</Text>
        <Text style={screenStyles.cardText}>마지막 구매일: {formatDate(preview.lastPurchasedAt)}</Text>
        <Text style={screenStyles.cardText}>예상 소진일: {formatDate(preview.nextEstimatedRunOutAt)}</Text>
        {preview.requiresApprovalOrConfirmation ? <Text style={screenStyles.errorText}>가족 확인이 필요한 금액이에요.</Text> : null}
        {preview.recentPurchaseAmount ? <Text style={screenStyles.cardText}>지난번에는 {formatMoney(preview.recentPurchaseAmount)}으로 기록했어요.</Text> : null}
        {linkMessage ? <Text style={screenStyles.errorText}>{linkMessage}</Text> : null}
        <AppButton
          title="상품 보러가기"
          onPress={() => void openProduct(preview.representativeProductUrl)}
          disabled={!isValidUrl(preview.representativeProductUrl)}
          loading={openingUrl}
        />
        <AppButton title="주문했어요" onPress={() => navigation.navigate("PurchaseConfirm", { itemId: route.params.itemId })} variant="secondary" />
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>구매 규칙</Text>
        {preview.purchaseRule ? (
          <>
            <Text style={screenStyles.cardText}>가격 상한: {formatMoney(preview.purchaseRule.priceLimit)}</Text>
            <Text style={screenStyles.cardText}>확인 필요 금액: {formatMoney(preview.purchaseRule.approvalRequiredAbove)}</Text>
            {preview.purchaseRule.note ? <Text style={screenStyles.cardText}>{preview.purchaseRule.note}</Text> : null}
          </>
        ) : (
          <Text style={screenStyles.cardText}>정해둔 구매 규칙이 없어요.</Text>
        )}
      </AppCard>
    </Screen>
  );
}
