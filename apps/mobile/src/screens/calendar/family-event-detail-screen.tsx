import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppCard } from "../../components/app-card";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { Screen } from "../../components/screen";
import { useFamily } from "../../family/family-context";
import { useFamilyEvent } from "../../features/calendar/queries";
import type { CalendarStackParamList } from "../../navigation/types";
import { formatDateTime } from "../../utils/format";
import { screenStyles } from "../styles";

type Props = NativeStackScreenProps<CalendarStackParamList, "FamilyEventDetail">;

export function FamilyEventDetailScreen({ route }: Props) {
  const { selectedFamilyId } = useFamily();
  const query = useFamilyEvent(selectedFamilyId, route.params.eventId);
  const event = query.data?.event;

  return (
    <Screen>
      {query.isLoading ? (
        <LoadingState message="가족 일정을 불러오고 있어요." />
      ) : query.error ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : event ? (
        <>
          <View>
            <Text style={screenStyles.eyebrow}>{eventTypeLabel(event.eventType)}</Text>
            <Text style={screenStyles.title}>{event.title}</Text>
            <Text style={screenStyles.subtitle}>{event.location ?? "장소가 정해지지 않았어요."}</Text>
          </View>
          <AppCard>
            <Text style={screenStyles.cardTitle}>일정 시간</Text>
            <Text style={screenStyles.cardText}>{event.allDay ? "종일" : `${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}`}</Text>
            <Text style={screenStyles.cardText}>시간대: {event.timezone}</Text>
          </AppCard>
          {event.description ? (
            <AppCard>
              <Text style={screenStyles.cardTitle}>메모</Text>
              <Text style={screenStyles.cardText}>{event.description}</Text>
            </AppCard>
          ) : null}
        </>
      ) : (
        <ErrorState message="정보를 찾을 수 없어요." />
      )}
    </Screen>
  );
}

function eventTypeLabel(value: string) {
  return (
    {
      TRAVEL: "여행",
      VACATION: "휴가",
      BUSINESS_TRIP: "출장",
      FAMILY_EVENT: "가족 행사",
      CHILD_EVENT: "아이 일정",
      SOCIAL_EVENT: "경조사",
      MEDICAL: "병원",
      OTHER: "기타",
    }[value] ?? "가족 일정"
  );
}
