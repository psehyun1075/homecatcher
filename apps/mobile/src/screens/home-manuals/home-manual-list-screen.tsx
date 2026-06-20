import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppCard } from "../../components/app-card";
import { AppInput } from "../../components/app-input";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useHomeManuals } from "../../features/home-manuals/queries";
import type { HomeManual } from "../../features/home-manuals/types";
import type { MyHomeStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<MyHomeStackParamList, "HomeManualList">;

export function HomeManualListScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const [search, setSearch] = useState("");
  const query = useHomeManuals(selectedFamilyId, { search: search.trim() || undefined });
  const manuals = (query.data?.homeManuals ?? []).slice().sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState message="우리집 매뉴얼을 불러오고 있어요." />
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
      data={manuals}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
      ListHeaderComponent={
        <>
          <Text style={screenStyles.title}>우리집 매뉴얼</Text>
          <Text style={screenStyles.subtitle}>매번 설명하지 않아도 함께 볼 수 있어요.</Text>
          <AppInput label="간단 검색" value={search} onChangeText={setSearch} placeholder="제목이나 카테고리" />
        </>
      }
      ListEmptyComponent={<EmptyState title="아직 등록된 우리집 매뉴얼이 없어요." />}
      renderItem={({ item }) => <ManualCard manual={item} onPress={() => navigation.navigate("HomeManualDetail", { manualId: item.id })} />}
    />
  );
}

function ManualCard({ manual, onPress }: { manual: HomeManual; onPress: () => void }) {
  const relationCount = manual.relations.length;

  return (
    <AppCard onPress={onPress} accessibilityLabel={`${manual.title} 매뉴얼 보기`}>
      <Text style={screenStyles.cardTitle}>
        {manual.isPinned ? "고정 · " : ""}
        {manual.title}
      </Text>
      <Text style={screenStyles.cardText}>{manual.category ?? "카테고리 없음"}</Text>
      {manual.description ? <Text style={screenStyles.cardText}>{manual.description}</Text> : null}
      <Text style={screenStyles.cardText}>
        단계 {manual.steps.length}개 · 연결 {relationCount}개
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.xl },
});
