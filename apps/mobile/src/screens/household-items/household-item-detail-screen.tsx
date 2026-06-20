import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { RemoteImage } from "../../components/remote-image";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useHouseholdItem, useItemPurchases } from "../../features/household-items/queries";
import type { HouseholdItemsStackParamList } from "../../navigation/types";
import { compactUrl, formatDate, formatMoney } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<HouseholdItemsStackParamList, "HouseholdItemDetail">;

export function HouseholdItemDetailScreen({ navigation, route }: Props) {
  const { selectedFamilyId } = useFamily();
  const itemQuery = useHouseholdItem(selectedFamilyId, route.params.itemId);
  const purchasesQuery = useItemPurchases(selectedFamilyId, route.params.itemId);

  if (itemQuery.isLoading) {
    return (
      <Screen>
        <LoadingState message="생필품 정보를 불러오고 있어요." />
      </Screen>
    );
  }

  if (itemQuery.error || !itemQuery.data) {
    return (
      <Screen>
        <ErrorState message={itemQuery.error?.message ?? "정보를 찾을 수 없어요."} onRetry={() => void itemQuery.refetch()} />
        <AppButton title="목록으로 돌아가기" onPress={() => navigation.goBack()} variant="secondary" />
      </Screen>
    );
  }

  const item = itemQuery.data.householdItem;
  const link = item.productLinks[0] ?? null;
  const recentPurchases = purchasesQuery.data?.purchases ?? [];

  return (
    <Screen>
      <AppCard>
        <View style={screenStyles.row}>
          <View style={{ flex: 1 }}>
            <Text style={screenStyles.title}>{item.name}</Text>
            <Text style={screenStyles.subtitle}>{item.category ?? "카테고리 없음"}</Text>
          </View>
          <RemoteImage uri={link?.productImageUrl} label={`${item.name} 상품 사진`} />
        </View>
        <Text style={screenStyles.cardText}>상품명: {link?.productName ?? "아직 연결된 상품이 없어요."}</Text>
        <Text style={screenStyles.cardText}>쇼핑몰: {link?.mallName ?? "없음"}</Text>
        <Text style={screenStyles.cardText}>상품 URL: {link ? link.mallName ?? compactUrl(link.url) ?? "연결된 상품" : "아직 연결된 상품이 없어요."}</Text>
        <Text style={screenStyles.cardText}>미리보기 가격: {formatMoney(link?.price, link?.currency ?? "KRW")}</Text>
        <Text style={screenStyles.cardText}>최근 구매일: {formatDate(item.lastPurchasedAt)}</Text>
        <Text style={screenStyles.cardText}>예상 소진일: {formatDate(item.nextEstimatedRunOutAt)}</Text>
        {item.memo ? <Text style={screenStyles.cardText}>메모: {item.memo}</Text> : null}
        {link ? <AppButton title="재주문 확인하기" onPress={() => navigation.navigate("ReorderPreview", { itemId: item.id })} /> : null}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>구매 규칙</Text>
        {item.purchaseRule ? (
          <>
            <Text style={screenStyles.cardText}>대체 정책: {item.purchaseRule.substitutionPolicy}</Text>
            <Text style={screenStyles.cardText}>가격 상한: {formatMoney(item.purchaseRule.priceLimit)}</Text>
            <Text style={screenStyles.cardText}>확인 필요 금액: {formatMoney(item.purchaseRule.approvalRequiredAbove)}</Text>
            {item.purchaseRule.note ? <Text style={screenStyles.cardText}>{item.purchaseRule.note}</Text> : null}
          </>
        ) : (
          <Text style={screenStyles.cardText}>아직 정해둔 구매 규칙이 없어요.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={screenStyles.cardTitle}>최근 구매 내역</Text>
        {recentPurchases.length === 0 ? (
          <Text style={screenStyles.cardText}>아직 구매 기록이 없어요.</Text>
        ) : (
          recentPurchases.slice(0, 3).map((purchase) => (
            <Text key={purchase.id} style={screenStyles.cardText}>
              {formatDate(purchase.purchasedAt)} · {formatMoney(purchase.totalAmount, purchase.currency)}
            </Text>
          ))
        )}
      </AppCard>
    </Screen>
  );
}
