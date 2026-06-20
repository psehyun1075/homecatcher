import { useQuery } from "@tanstack/react-query";

import { getHomeManual, listHomeManuals } from "../../api/home-manuals-api";
import type { ListHomeManualsParams } from "./types";

export const homeManualKeys = {
  list: (familyId: string, params: ListHomeManualsParams) => ["familyScope", familyId, "homeManuals", params] as const,
  detail: (familyId: string, manualId: string) => ["familyScope", familyId, "homeManual", manualId] as const,
};

export function useHomeManuals(familyId?: string | null, params: ListHomeManualsParams = {}) {
  return useQuery({
    queryKey: homeManualKeys.list(familyId ?? "none", params),
    queryFn: () => listHomeManuals(familyId!, params),
    enabled: Boolean(familyId),
  });
}

export function useHomeManual(familyId: string | undefined | null, manualId: string) {
  return useQuery({
    queryKey: homeManualKeys.detail(familyId ?? "none", manualId),
    queryFn: () => getHomeManual(manualId),
    enabled: Boolean(familyId && manualId),
  });
}
