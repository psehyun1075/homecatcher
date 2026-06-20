import { apiRequest } from "./client";
import type { HomeManual, ListHomeManualsParams, ManualRelation, ManualStep } from "../features/home-manuals/types";

function toQuery(params: ListHomeManualsParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  return search.toString();
}

export function listHomeManuals(familyId: string, params: ListHomeManualsParams = {}) {
  const query = toQuery({ page: 1, limit: 50, ...params });
  return apiRequest<{ homeManuals: HomeManual[]; page: number; limit: number; total: number }>(`/families/${familyId}/home-manuals?${query}`);
}

export function getHomeManual(manualId: string) {
  return apiRequest<{ homeManual: HomeManual }>(`/home-manuals/${manualId}`);
}

export function listManualSteps(manualId: string) {
  return apiRequest<{ steps: ManualStep[] }>(`/home-manuals/${manualId}/steps`);
}

export function listManualRelations(manualId: string) {
  return apiRequest<{ relations: ManualRelation[] }>(`/home-manuals/${manualId}/relations`);
}
