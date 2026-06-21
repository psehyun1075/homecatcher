import { apiRequest } from "./client";
import type { CreateFamilyEventInput, FamilyEvent } from "../features/calendar/types";

export function listFamilyEvents(familyId: string, params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiRequest<{ events: FamilyEvent[]; page: number; limit: number; total: number }>(`/families/${familyId}/events?${query.toString()}`);
}

export function createFamilyEvent(familyId: string, input: CreateFamilyEventInput) {
  return apiRequest<{ event: FamilyEvent }>(`/families/${familyId}/events`, {
    method: "POST",
    body: input,
  });
}

export function getFamilyEvent(eventId: string) {
  return apiRequest<{ event: FamilyEvent }>(`/events/${eventId}`);
}
