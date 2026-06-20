import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppCard } from "../../components/app-card";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { RemoteImage } from "../../components/remote-image";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useHouseholdItems } from "../../features/household-items/queries";
import type { HouseholdItem } from "../../features/household-items/types";
import type { HouseholdItemsStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { formatDate } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<HouseholdItemsStackParamList, "HouseholdItemList">;

export function HouseholdItemListScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useHouseholdItems(selectedFamilyId);
  const items = query.data?.householdItems ?? [];

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="생필품을 불러오고 있어요." />
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
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={screenStyles.title}>생필품</Text>
          <Text style={screenStyles.subtitle}>떨어지기 전에 우리집이 함께 챙겨요.</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState title="아직 등록된 생필품이 없어요." message="템플릿을 적용하면 기본 생필품이 여기에 보여요." />}
      renderItem={({ item }) => <HouseholdItemCard item={item} onPress={() => navigation.navigate("HouseholdItemDetail", { itemId: item.id })} />}
    />
  );
}

function HouseholdItemCard({ item, onPress }: { item: HouseholdItem; onPress: () => void }) {
  const primaryLink = item.productLinks[0] ?? null;
  const needsSoon = item.nextEstimatedRunOutAt ? new Date(item.nextEstimatedRunOutAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 : false;

  return (
    <AppCard onPress={onPress} accessibilityLabel={`${item.name} 상세 보기`}>
      <View style={styles.row}>
        <RemoteImage uri={primaryLink?.productImageUrl} label={`${item.name} 상품 사진`} />
        <View style={styles.textColumn}>
          <Text style={screenStyles.cardTitle}>{item.name}</Text>
          <Text style={screenStyles.cardText}>{item.category ?? "카테고리 없음"}</Text>
          <Text style={screenStyles.cardText}>{primaryLink?.productName ?? primaryLink?.mallName ?? "등록된 상품이 아직 없어요."}</Text>
          <Text style={needsSoon ? styles.warningText : screenStyles.cardText}>
            {needsSoon ? "곧 떨어질 것 같아요." : "아직 여유가 있어요."}
          </Text>
          <Text style={screenStyles.cardText}>
            최근 구매 {formatDate(item.lastPurchasedAt)} · 소진 예상 {formatDate(item.nextEstimatedRunOutAt)}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  warningText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
  },
});
