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
};

export type MainTabParamList = {
  Home: undefined;
  HouseholdItems: NavigatorScreenParams<HouseholdItemsStackParamList>;
  Todos: NavigatorScreenParams<TodosStackParamList>;
  Calendar: undefined;
  MyHome: NavigatorScreenParams<MyHomeStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
