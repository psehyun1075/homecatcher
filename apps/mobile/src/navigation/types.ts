import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type OnboardingStackParamList = {
  FamilyStart: undefined;
  FamilyCreate: undefined;
  InviteJoin: undefined;
  FamilySelect: undefined;
  TemplateSelect: { familyId: string; canSkip?: boolean };
  TemplateDetail: { familyId: string; templateId: string };
};

export type HouseholdItemsStackParamList = {
  HouseholdItemList: undefined;
  HouseholdItemDetail: { itemId: string };
  ReorderPreview: { itemId: string };
  PurchaseConfirm: { itemId: string };
};

export type TodosStackParamList = {
  TodoList: undefined;
  TodoDetail: { todoId: string };
  TodoComplete: { todoId: string };
};

export type MyHomeStackParamList = {
  MyHomeMain: undefined;
  HomeManualList: undefined;
  HomeManualDetail: { manualId: string };
  AccountbookHome: undefined;
  AccountbookEntries: { month?: string } | undefined;
  AccountbookEntryCreate: { month?: string } | undefined;
  FixedExpenseList: undefined;
  FixedExpenseCreate: { initialTitle?: string; initialAmount?: string } | undefined;
  FixedExpenseDetail: { fixedExpenseId: string; dueDate?: string; occurrenceStatus?: string; occurrenceKey?: string };
  FixedExpensePayment: { fixedExpenseId: string; dueDate: string; occurrenceKey?: string };
};

export type CalendarStackParamList = {
  CalendarMonth: undefined;
  CalendarDay: { date: string };
  FamilyEventDetail: { eventId: string };
  FamilyEventCreate: { date?: string };
};

export type MainTabParamList = {
  Home: undefined;
  HouseholdItems: NavigatorScreenParams<HouseholdItemsStackParamList>;
  Todos: NavigatorScreenParams<TodosStackParamList>;
  Calendar: NavigatorScreenParams<CalendarStackParamList>;
  MyHome: NavigatorScreenParams<MyHomeStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
