import { useState } from "react";
import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, hasApiBaseUrl } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { AppInput } from "../components/app-input";
import { ErrorState } from "../components/error-state";
import { Screen } from "../components/screen";
import type { AuthStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(trimmedEmail, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasApiBaseUrl()) {
    return (
      <Screen>
        <ErrorState message="EXPO_PUBLIC_API_BASE_URL 환경변수를 설정해 주세요." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppCard>
        <TextBlock eyebrow="홈캐처" title="우리집 일을 놓치지 않게" subtitle="로그인하고 우리집에 필요한 것만 먼저 준비해요." />
        <AppInput label="이메일" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AppInput label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <TextError message={error} /> : null}
        <AppButton title="로그인" onPress={submit} loading={loading} />
        <AppButton title="회원가입" onPress={() => navigation.navigate("Signup")} variant="ghost" />
      </AppCard>
    </Screen>
  );
}

function TextBlock({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <>
      <Text style={screenStyles.eyebrow}>{eyebrow}</Text>
      <Text style={screenStyles.title}>{title}</Text>
      <Text style={screenStyles.subtitle}>{subtitle}</Text>
    </>
  );
}

function TextError({ message }: { message: string }) {
  return <Text style={screenStyles.errorText}>{message}</Text>;
}
