import { Text, TextInput } from "../components/typography";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { auth, queryClient } from "../lib/client";
import { AppBackground } from "../components/app-background";
export default function Login() {
  const [signup, setSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const session = auth.useSession();
  if (session.data) return <Redirect href="/packs" />;
  const submit = async () => {
    if (busy) return;
    const errors: Record<string, string> = {};
    if (signup && name.length < 2)
      errors.name = "ニックネームは2文字以上にしてください";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "メールアドレスの形式が正しくありません";
    if (password.length < 8)
      errors.password = "パスワードは8文字以上にしてください";
    setValidation(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    setError("");
    try {
      const result = signup
        ? await auth.signUp.email({ email, password, name })
        : await auth.signIn.email({ email, password });
      if (result.error)
        setError(result.error.message ?? "ログインできませんでした");
      else {
        queryClient.clear();
        router.replace("/packs");
      }
    } catch {
      setError("接続できませんでした。通信環境を確認してください。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <AppBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 40,
          paddingBottom: 32,
          alignItems: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            width: "100%",
            maxWidth: 448,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,.8)",
            padding: 24,
            boxShadow:
              "0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)",
          }}
        >
          <Text
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {signup ? "Create Account" : "Welcome Back"}
          </Text>
          <View style={{ gap: 16 }}>
            {(signup
              ? ["name", "email", "password"]
              : ["email", "password"]
            ).map((field) => (
              <View key={field} style={{ gap: 8 }}>
                <Text
                  nativeID={`${field}-label`}
                  style={{ fontSize: 12, lineHeight: 12 }}
                >
                  {field === "name"
                    ? "ニックネーム"
                    : field === "email"
                      ? "メールアドレス"
                      : "パスワード"}
                </Text>
                <TextInput
                  accessibilityLabel={
                    field === "name"
                      ? "ニックネーム"
                      : field === "email"
                        ? "メールアドレス"
                        : "パスワード"
                  }
                  value={
                    field === "name"
                      ? name
                      : field === "email"
                        ? email
                        : password
                  }
                  onChangeText={
                    field === "name"
                      ? setName
                      : field === "email"
                        ? setEmail
                        : setPassword
                  }
                  secureTextEntry={field === "password"}
                  autoCapitalize="none"
                  keyboardType={field === "email" ? "email-address" : "default"}
                  autoComplete={
                    field === "password"
                      ? signup
                        ? "new-password"
                        : "current-password"
                      : field === "email"
                        ? "email"
                        : "name"
                  }
                  style={{
                    height: 32,
                    borderWidth: 1,
                    borderColor: "#e5e5e5",
                    borderRadius: 0,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    fontSize: 12,
                    color: "#1e293b",
                  }}
                />
                {!!validation[field] && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: "#ef4444", fontSize: 16 }}
                  >
                    {validation[field]}
                  </Text>
                )}
              </View>
            ))}
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: "#ef4444" }}>
                {error}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={{
                height: 44,
                borderRadius: 999,
                backgroundColor: "#0ea5e9",
                justifyContent: "center",
                alignItems: "center",
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>
                {busy ? "送信中…" : signup ? "登録する" : "ログイン"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSignup(!signup);
              setValidation({});
              setError("");
            }}
            style={{
              marginTop: 16,
              minHeight: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#0284c7", fontSize: 12 }}>
              {signup ? "アカウントをお持ちの方はログイン" : "アカウントを作る"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
