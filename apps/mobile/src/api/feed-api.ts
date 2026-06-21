import { apiRequest } from "./client";
import type { Activity, Appreciation, CreateAppreciationInput } from "../features/feed/types";

export interface FeedParams {
  cursor?: string | null;
  limit?: number;
  activityType?: string;
  actorMemberId?: string;
  from?: string;
  to?: string;
}

export function listFeed(familyId: string, params: FeedParams = {}) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.activityType) search.set("activityType", params.activityType);
  if (params.actorMemberId) search.set("actorMemberId", params.actorMemberId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  return apiRequest<{ activities: Activity[]; nextCursor: string | null }>(`/families/${familyId}/feed?${search.toString()}`);
}

export function getActivity(activityId: string) {
  return apiRequest<{ activity: Activity }>(`/activities/${activityId}`);
}

export function createAppreciation(activityId: string, input: CreateAppreciationInput = {}) {
  return apiRequest<{ appreciation: Appreciation; idempotent: boolean }>(`/activities/${activityId}/appreciations`, {
    method: "POST",
    body: input,
  });
}

export function listAppreciations(activityId: string) {
  return apiRequest<{ appreciations: Appreciation[] }>(`/activities/${activityId}/appreciations`);
}

export function deleteAppreciation(appreciationId: string) {
  return apiRequest<{ appreciation: Appreciation }>(`/appreciations/${appreciationId}`, {
    method: "DELETE",
  });
}
