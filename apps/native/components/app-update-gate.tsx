import { useTranslation } from "@/lib/i18n";
import { nativeApplicationVersion } from "expo-application";
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Button,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "../lib/client";
import appConfig from "../app.json";
import easConfig from "../eas.json";

type Status = "rechecking" | "checking" | "allowed" | "required" | "error";

export function AppUpdateGate({ children }: PropsWithChildren) {
  const platform = Platform.OS;
  if (platform !== "ios" && platform !== "android") return children;
  return <MobileGate platform={platform}>{children}</MobileGate>;
}

function MobileGate({ platform, children }: PropsWithChildren<{ platform: "ios" | "android" }>) {
  const t = useTranslation();
  const [status, setStatus] = useState<Status>("checking");
  const pending = useRef<AbortController | null>(null);
  const check = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      if (!nativeApplicationVersion) throw new Error("missing native version");
      const result = await client.appUpdate.query(
        { platform, version: nativeApplicationVersion },
        { signal: controller.signal },
      );
      if (pending.current === controller) setStatus(result.required ? "required" : "allowed");
    } catch {
      if (pending.current === controller) setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }, [platform]);

  useEffect(() => {
    void check();
    let background = AppState.currentState === "background";
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") background = true;
      if (state === "active" && background) {
        background = false;
        setStatus((previous) => (previous === "allowed" ? "rechecking" : previous));
        void check();
      }
    });
    return () => {
      subscription.remove();
      pending.current?.abort();
      pending.current = null;
    };
  }, [check]);

  if (status === "allowed" || status === "rechecking") {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: status === "allowed" ? "flex" : "none" }}>{children}</View>
        {status === "rechecking" && <ActivityIndicator accessibilityLabel={t("checkingVersion")} />}
      </View>
    );
  }
  const ios = platform === "ios";
  const store = ios ? "App Store" : "Google Play";
  const openStore = async () => {
    const url = ios
      ? `https://apps.apple.com/app/id${easConfig.submit.production.ios.ascAppId}`
      : `https://play.google.com/store/apps/details?id=${appConfig.expo.android.package}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("storeOpenFailed", { store: store }), t("findInStore"));
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        gap: 16,
        padding: 24,
      }}
    >
      {status === "checking" ? (
        <ActivityIndicator accessibilityLabel={t("checkingVersion")} />
      ) : status === "required" ? (
        <>
          <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "bold" }}>
            {t("updateRequired")}
          </Text>
          <Text>{t("updateMessage")}</Text>
          <Button title={t("openStore", { store: store })} onPress={() => void openStore()} />
        </>
      ) : (
        <>
          <Text accessibilityRole="alert">{t("versionCheckFailed")}</Text>
          <Button
            title={t("retry")}
            onPress={() => {
              setStatus("checking");
              void check();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
