import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/app-button";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCalendarMonth } from "../../features/calendar/queries";
import type { CalendarStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { dateKeyInSeoul, monthKeyInSeoul, monthLabel, shiftMonth } from "../../utils/format";
import { screenStyles } from "../styles";
import { calendarStyles } from "./calendar-styles";

type Props = NativeStackScreenProps<CalendarStackParamList, "CalendarMonth">;

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarMonthScreen({ navigation }: Props) {
  const { selectedFamilyId } = useFamily();
  const { width } = useWindowDimensions();
  const today = dateKeyInSeoul();
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(monthKeyInSeoul());
  const [selectedDate, setSelectedDate] = useState(today);
  const query = useCalendarMonth(selectedFamilyId, month);
  const dayMap = useMemo(() => new Map((query.data?.days ?? []).map((day) => [day.date, day])), [query.data?.days]);
  const weeks = useMemo(() => buildCalendarCells(month), [month]);
  const chipLimit = width < 380 ? 1 : width < 520 ? 2 : 3;

  const moveMonth = (delta: number) => {
    const nextMonth = shiftMonth(month, delta);
    setMonth(nextMonth);
    setSelectedDate(nextMonth === currentMonth ? today : `${nextMonth}-01`);
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View>
          <Text style={screenStyles.title}>가족 캘린더</Text>
          <Text style={screenStyles.subtitle}>가족 일정, 할 일, 고정지출, 생필품 소진 예정을 한 달로 봐요.</Text>
        </View>

        <View style={screenStyles.row}>
          <AppButton title="이전" variant="secondary" onPress={() => moveMonth(-1)} />
          <Text style={screenStyles.cardTitle}>{monthLabel(month)}</Text>
          <AppButton title="다음" variant="secondary" onPress={() => moveMonth(1)} />
        </View>
        <View style={screenStyles.row}>
          <AppButton
            title="오늘"
            variant="secondary"
            onPress={() => {
              setMonth(currentMonth);
              setSelectedDate(today);
            }}
          />
          <AppButton title="새로고침" variant="secondary" onPress={() => void query.refetch()} loading={query.isRefetching} disabled={query.isRefetching} />
          <AppButton title="일정 추가" onPress={() => navigation.navigate("FamilyEventCreate", { date: selectedDate })} />
        </View>

        {query.isLoading ? (
          <LoadingState message="달력을 불러오고 있어요." />
        ) : query.error ? (
          <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
        ) : (
          <View style={calendarStyles.grid}>
            <View style={calendarStyles.week}>
              {weekdays.map((day) => (
                <Text key={day} style={calendarStyles.weekday}>
                  {day}
                </Text>
              ))}
            </View>
            {weeks.map((week) => (
              <View key={week.map((cell) => cell.date).join("-")} style={calendarStyles.week}>
                {week.map((cell) => {
                  const bucket = dayMap.get(cell.date);
                  const items = bucket?.items ?? [];
                  const extraCount = Math.max(0, items.length - chipLimit);
                  return (
                    <Pressable
                      key={cell.date}
                      accessibilityRole="button"
                      accessibilityLabel={`${cell.date} 일정 보기`}
                      onPress={() => {
                        setSelectedDate(cell.date);
                        navigation.navigate("CalendarDay", { date: cell.date });
                      }}
                      style={[
                        calendarStyles.dayCell,
                        !cell.inMonth ? calendarStyles.outsideDay : null,
                        selectedDate === cell.date ? calendarStyles.selectedDay : null,
                      ]}
                    >
                      <Text style={[calendarStyles.dateText, cell.date === today ? calendarStyles.today : null]}>{Number(cell.date.slice(8, 10))}</Text>
                      {items.slice(0, chipLimit).map((item) => (
                        <View key={item.occurrenceKey} style={[calendarStyles.chip, { backgroundColor: item.displayColor ?? colors.accent }]}>
                          <Text numberOfLines={1} style={calendarStyles.chipText}>
                            {item.title}
                          </Text>
                        </View>
                      ))}
                      {extraCount > 0 ? <Text style={screenStyles.cardText}>+{extraCount}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        {!query.isLoading && !query.error && (query.data?.days ?? []).every((day) => day.items.length === 0) ? (
          <EmptyState title="이 달에는 표시할 일정이 없어요." />
        ) : null}
      </View>
    </Screen>
  );
}

function buildCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + weekIndex * 7 + dayIndex);
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      return { date: dateKey, inMonth: dateKey.startsWith(monthKey) };
    }),
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    gap: spacing.lg,
  },
});
