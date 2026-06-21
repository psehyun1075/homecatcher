export interface User {
  id: string;
  email: string;
  name: string;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Family {
  id: string;
  familyName: string;
  ownerUserId?: string | null;
  memberCount: number;
  role?: "OWNER" | "ADMIN" | "MEMBER";
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyMember {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  displayName: string | null;
  joinedAt: string;
  user: User | null;
}

export interface Invite {
  id: string;
  familyId: string;
  familyName: string;
  code: string;
  status: string;
  expiresAt?: string | null;
}

export interface TemplateSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemCounts: {
    householdItems: number;
    todos: number;
    manuals: number;
  };
}

export interface TemplateItem {
  id: string;
  itemType: "HOUSEHOLD_ITEM" | "TODO_TASK" | "HOME_MANUAL";
  title: string;
  content: unknown;
  sortOrder: number;
}

export interface TemplateDetail extends TemplateSummary {
  items: TemplateItem[];
}

export interface CalendarDayItem {
  sourceType: string;
  sourceId: string;
  occurrenceKey: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  displayColor?: string;
}

export interface CalendarDay {
  date: string;
  itemCount: number;
  items: CalendarDayItem[];
}
