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

export type MainTabParamList = {
  Home: undefined;
  HouseholdItems: undefined;
  Todos: undefined;
  Calendar: undefined;
  MyHome: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
