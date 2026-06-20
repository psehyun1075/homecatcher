import { useState } from "react";
import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { AppButton } from "../components/app-button";
import { AppCard } from "../components/app-card";
import { AppInput } from "../components/app-input";
import { Screen } from "../components/screen";
import type { AuthStackParamList } from "../navigation/types";
import { screenStyles } from "./styles";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) return setError("이름은 2자 이상이어야 해요.");
    if (!trimmedEmail.includes("@")) return setError("이메일 형식을 확인해 주세요.");
    if (password.length < 8) return setError("비밀번호는 8자 이상이어야 해요.");
    if (password !== passwordConfirm) return setError("비밀번호 확인이 달라요.");
    setLoading(true);
    setError(null);
    try {
      await signUp(trimmedName, trimmedEmail, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "잠시 연결이 어려워요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppCard>
        <Text style={screenStyles.eyebrow}>처음 오셨나요?</Text>
        <Text style={screenStyles.title}>처음엔 필요한 것만 준비할게요.</Text>
        <Text style={screenStyles.subtitle}>계정을 만들고 우리집을 가볍게 시작해요.</Text>
        <AppInput label="이름" value={name} onChangeText={setName} />
        <AppInput label="이메일" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AppInput label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        <AppInput label="비밀번호 확인" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
        {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
        <AppButton title="가입하기" onPress={submit} loading={loading} />
        <AppButton title="로그인으로 돌아가기" onPress={() => navigation.goBack()} variant="ghost" />
      </AppCard>
    </Screen>
  );
}
