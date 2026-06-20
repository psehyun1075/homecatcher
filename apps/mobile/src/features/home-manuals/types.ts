import type { FamilyMemberSummary } from "../todos/types";

export interface ManualStep {
  id: string;
  homeManualId: string;
  title: string;
  description: string | null;
  warning: string | null;
  mediaUrl: string | null;
  sortOrder: number;
  stepNo?: number | null;
}

export interface ManualRelation {
  id: string;
  homeManualId: string;
  targetType: string | null;
  householdItemId: string | null;
  todoTaskId: string | null;
  note: string | null;
  householdItem: { id: string; name: string; category: string | null } | null;
  todo: { id: string; title: string; category: string | null } | null;
}

export interface HomeManual {
  id: string;
  familyId: string;
  title: string;
  category: string | null;
  description: string | null;
  isPinned: boolean;
  createdByMember: FamilyMemberSummary | null;
  steps: ManualStep[];
  relations: ManualRelation[];
}

export interface ListHomeManualsParams {
  search?: string;
  page?: number;
  limit?: number;
}
