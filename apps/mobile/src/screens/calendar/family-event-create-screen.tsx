import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { AppButton } from "../../components/app-button";
import { AppInput } from "../../components/app-input";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useCreateFamilyEvent } from "../../features/calendar/mutations";
import type { CalendarStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { dateKeyInSeoul, isValidDateKey, toDateTimeOffset } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<CalendarStackParamList, "FamilyEventCreate">;

const eventTypes = [
  ["TRAVEL", "여행"],
  ["VACATION", "휴가"],
  ["BUSINESS_TRIP", "출장"],
  ["FAMILY_EVENT", "가족 행사"],
  ["CHILD_EVENT", "아이 일정"],
  ["SOCIAL_EVENT", "경조사"],
  ["MEDICAL", "병원"],
  ["OTHER", "기타"],
] as const;

export function FamilyEventCreateScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { selectedFamilyId } = useFamily();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<(typeof eventTypes)[number][0]>("FAMILY_EVENT");
  const [date, setDate] = useState(route.params.date ?? dateKeyInSeoul());
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(route.params.date ?? dateKeyInSeoul());
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateFamilyEvent(selectedFamilyId ?? "");

  const submit = () => {
    const normalizedTitle = title.trim();
    if (!selectedFamilyId || !normalizedTitle) {
      setError("가족 일정 이름을 입력해 주세요.");
      return;
    }
    if (!isValidDateKey(date) || !isValidDateKey(endDate) || !isTime(startTime) || !isTime(endTime)) {
      setError("날짜를 확인해 주세요.");
      return;
    }
    const startAt = allDay ? toDateTimeOffset(date, "00:00") : toDateTimeOffset(date, startTime);
    const endAt = allDay ? toDateTimeOffset(endDate, "23:59") : toDateTimeOffset(endDate, endTime);
    if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
      setError("일정 종료 시간은 시작 시간보다 빠를 수 없어요.");
      return;
    }
    setError(null);
    mutation.mutate(
      {
        title: normalizedTitle,
        eventType,
        startAt,
        endAt,
        allDay,
        timezone: "Asia/Seoul",
        location: location.trim() || null,
        description: description.trim() || null,
        recurrenceType: "ONCE",
        participantMemberIds: [],
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "calendar"] });
          await queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "events"] });
          await queryClient.invalidateQueries({ queryKey: ["familyScope", selectedFamilyId, "home"] });
          Alert.alert("일정을 추가했어요", "가족 캘린더에 일정을 추가했어요.");
          navigation.navigate("CalendarDay", { date });
        },
        onError: (submitError) => setError(submitError.message),
      },
    );
  };

  return (
    <Screen>
      <View>
        <Text style={screenStyles.title}>가족 일정 추가</Text>
        <Text style={screenStyles.subtitle}>처음엔 필요한 정보만 적어도 충분해요.</Text>
      </View>
      <AppInput label="일정 이름" value={title} onChangeText={setTitle} placeholder="제주도 가족여행" />
      <Text style={screenStyles.cardTitle}>일정 유형</Text>
      <View style={styles.typeGrid}>
        {eventTypes.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`${label} 선택`}
            onPress={() => setEventType(value)}
            style={[styles.typeButton, eventType === value ? styles.selectedType : null]}
          >
            <Text style={[styles.typeText, eventType === value ? styles.selectedTypeText : null]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={screenStyles.row}>
        <AppInput label="시작일" value={date} onChangeText={setDate} placeholder="2026-07-10" style={styles.flexInput} />
        <AppInput label="시작 시간" value={startTime} onChangeText={setStartTime} placeholder="09:00" style={styles.flexInput} />
      </View>
      <View style={screenStyles.row}>
        <AppInput label="종료일" value={endDate} onChangeText={setEndDate} placeholder="2026-07-10" style={styles.flexInput} />
        <AppInput label="종료 시간" value={endTime} onChangeText={setEndTime} placeholder="10:00" style={styles.flexInput} />
      </View>
      <AppButton title={allDay ? "종일 일정이에요" : "시간이 있는 일정이에요"} variant="secondary" onPress={() => setAllDay((value) => !value)} />
      <AppInput label="장소" value={location} onChangeText={setLocation} placeholder="선택 입력" />
      <AppInput label="설명" value={description} onChangeText={setDescription} placeholder="선택 입력" multiline />
      {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
      <AppButton title="가족 캘린더에 추가" onPress={submit} loading={mutation.isPending} disabled={mutation.isPending} />
    </Screen>
  );
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const styles = StyleSheet.create({
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeButton: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectedType: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accent,
  },
  typeText: {
    color: colors.text,
    fontWeight: "700",
  },
  selectedTypeText: {
    color: colors.primaryDark,
  },
  flexInput: {
    minWidth: 130,
  },
});
