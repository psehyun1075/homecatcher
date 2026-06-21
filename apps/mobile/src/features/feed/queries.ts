import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getActivity, listAppreciations, listFeed, type FeedParams } from "../../api/feed-api";

export const feedKeys = {
  list: (familyId: string, filters?: Omit<FeedParams, "cursor">) => ["familyScope", familyId, "feed", filters ?? {}] as const,
  activity: (familyId: string, activityId: string) => ["familyScope", familyId, "activity", activityId] as const,
  appreciations: (familyId: string, activityId: string) => ["familyScope", familyId, "activity", activityId, "appreciations"] as const,
};

export function useFamilyFeed(familyId?: string | null, filters: Omit<FeedParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(familyId ?? "none", filters),
    queryFn: ({ pageParam }) => listFeed(familyId!, { ...filters, cursor: pageParam, limit: filters.limit ?? 20 }),
    enabled: Boolean(familyId),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useActivity(familyId: string | null | undefined, activityId: string) {
  return useQuery({
    queryKey: feedKeys.activity(familyId ?? "none", activityId),
    queryFn: () => getActivity(activityId),
    enabled: Boolean(familyId && activityId),
  });
}

export function useAppreciations(familyId: string | null | undefined, activityId: string) {
  return useQuery({
    queryKey: feedKeys.appreciations(familyId ?? "none", activityId),
    queryFn: () => listAppreciations(activityId),
    enabled: Boolean(familyId && activityId),
  });
}
