import { apiRequest } from "./client";
import type { Family, Invite } from "./types";

export function listFamilies() {
  return apiRequest<{ families: Family[] }>("/families");
}

export function createFamily(familyName: string) {
  return apiRequest<{ family: Family }>("/families", {
    method: "POST",
    body: { familyName },
  });
}

export function getInvite(inviteCode: string) {
  return apiRequest<{ invite: Invite }>(`/invites/${encodeURIComponent(inviteCode)}`);
}

export function acceptInvite(inviteCode: string) {
  return apiRequest<{ family: Pick<Family, "id" | "familyName">; invite: Invite; member: unknown }>(
    `/invites/${encodeURIComponent(inviteCode)}/accept`,
    { method: "POST" },
  );
}
