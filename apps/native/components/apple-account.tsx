import { useState } from "react";
import { Alert, Platform } from "react-native";
import * as Apple from "expo-apple-authentication";
import { auth, queryClient } from "@/lib/client";
import { installationSecret } from "@/lib/installation";
import { useAppleStatus } from "@/lib/apple-account";
import { useTranslation } from "@/lib/i18n";
import { Text } from "./typography";
import { Button, Loading, styles } from "./ui";

export function AppleAccount({ userId }: { userId: string }) {
  const t = useTranslation();
  const status = useAppleStatus(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (Platform.OS !== "ios") return null;
  if (status.data === undefined) return <Loading error={status.error} retry={status.refetch} />;
  if (status.data) return <Text style={styles.muted}>{t("appleLinked")}</Text>;
  async function authorize(mode: "link" | "restore") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const challenge = await auth.$fetch<{ nonce: string }>("/installation/challenge", {
        method: "POST",
      });
      if (!challenge.data) throw new Error();
      const nonce = challenge.data.nonce;
      const credential = await Apple.signInAsync({ nonce });
      const result = await auth.$fetch("/installation/apple", {
        method: "POST",
        body: { secret: installationSecret(), token: credential.identityToken, nonce, mode },
      });
      if (result.error) {
        setError(
          t(
            result.error.status === 409
              ? "appleConflict"
              : result.error.status === 404
                ? "appleMissing"
                : "operationFailed",
          ),
        );
        return;
      }
      if (mode === "restore") {
        queryClient.clear();
        await auth.getSession();
      }
      await status.refetch();
    } catch (e) {
      if (!(e instanceof Error && "code" in e && e.code === "ERR_REQUEST_CANCELED"))
        setError(t("operationFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={styles.muted}>{t("guestWarning")}</Text>
      <Button title={t("linkApple")} disabled={busy} onPress={() => void authorize("link")} />
      <Button
        title={t("restoreApple")}
        variant="link"
        disabled={busy}
        onPress={() =>
          Alert.alert(t("restoreApple"), t("restoreWarning"), [
            { text: t("cancel"), style: "cancel" },
            { text: t("restoreApple"), onPress: () => void authorize("restore") },
          ])
        }
      />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </>
  );
}
