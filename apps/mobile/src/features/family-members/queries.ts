import { useQuery } from "@tanstack/react-query";

import { listFamilyMembers } from "../../api/families-api";

export const familyMemberKeys = {
  list: (familyId: string) => ["familyScope", familyId, "members"] as const,
};

export function useFamilyMembers(familyId?: string | null) {
  return useQuery({
    queryKey: familyMemberKeys.list(familyId ?? "none"),
    queryFn: () => listFamilyMembers(familyId!),
    enabled: Boolean(familyId),
  });
}
