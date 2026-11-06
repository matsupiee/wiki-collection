import { Text } from "../../../components/typography";

import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { auth, queryClient } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Panel, Screen, styles } from "../../../components/ui";
import { openLegalPage, type LegalPath } from "../../../lib/legal-browser";
const menu = [
  ["/me/trades", "出品・入札の管理"],
  ["/me/wallet", "pt の履歴"],
  ["/me/openings", "開封履歴"],
  ["/legal/terms", "利用規約"],
  ["/legal/privacy", "プライバシーポリシー"],
  ["/legal/tokushoho", "特定商取引法に基づく表記"],
  ["/legal/payment-services", "資金決済法に基づく表示"],
] as const;
export default function Me() {
  const session = auth.useSession();
  const action = useAction();
  return (
    <Screen title="マイページ">
      <Panel style={{ padding: 20, gap: 0 }}>
        <Text style={[styles.title, { fontWeight: "900" }]}>{session.data?.user.name}</Text>
        <Text style={[styles.muted, { lineHeight: 16 }]}>{session.data?.user.email}</Text>
      </Panel>
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,.9)",
          boxShadow: "0 1px 2px #0000000d",
        }}
      >
        {menu.map(([url, label], i) => (
          <Pressable
            key={url}
            accessibilityRole="button"
            onPress={() =>
              url.startsWith("/legal/")
                ? void action.run(() => openLegalPage(url as LegalPath))
                : router.push(url as "/me/trades" | "/me/wallet" | "/me/openings")
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: i ? 1 : 0,
              borderColor: "#f1f5f9",
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#1e293b" }}>
              {label}
            </Text>
            <ChevronRight size={16} color="#94a3b8" />
          </Pressable>
        ))}
      </View>
      <Button
        title="ログアウト"
        variant="link"
        style={{ marginTop: 8 }}
        textStyle={{ color: "#f43f5e" }}
        disabled={action.pending}
        onPress={() =>
          void action.run(async () => {
            const result = await auth.signOut();
            if (result.error) throw new Error(result.error.message);
            queryClient.clear();
            router.replace("/login");
          })
        }
      />
      {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
    </Screen>
  );
}
