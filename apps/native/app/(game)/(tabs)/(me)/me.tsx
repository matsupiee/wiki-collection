import { useTranslation } from "@/lib/i18n";
import { Text } from "@/components/typography";

import { AppleAccount } from "@/components/apple-account";
import { Alert, Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { auth } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Button, Panel, Screen, styles } from "@/components/ui";
import { openLegalPage, type LegalPath } from "@/lib/legal-browser";

export default function Me() {
  const t = useTranslation();
  const menuGroups = [
    [
      ["/me/quests", t("quests")],
      ["/me/trades", t("manageTrades")],
      ["/me/wallet", t("pointHistory")],
      ["/me/openings", t("openingHistory")],
    ],
    [["/me/language", t("language")]],
    [
      ["/me/inquiries", t("inquiries")],
      ["/legal/terms", t("terms")],
      ["/legal/privacy", t("privacy")],
      ["/legal/tokushoho", t("commercialDisclosure")],
      ["/legal/payment-services", t("paymentDisclosure")],
    ],
  ] as const;
  const session = auth.useSession();
  const action = useAction();
  return (
    <Screen title={t("profile")}>
      <Panel style={{ padding: 20, gap: 8 }}>
        <Text style={[styles.title, { fontWeight: "900" }]}>{session.data?.user.name}</Text>
        {session.data && <AppleAccount userId={session.data.user.id} />}
      </Panel>
      {menuGroups.map((menu) => (
        <View
          key={menu[0][0]}
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
                  : router.push(
                      url as
                        | "/me/inquiries"
                        | "/me/trades"
                        | "/me/wallet"
                        | "/me/openings"
                        | "/me/language"
                        | "/me/quests",
                    )
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
      ))}
      <Button
        title={t("deleteAccount")}
        variant="link"
        disabled={action.pending}
        onPress={() =>
          Alert.alert(t("deleteAccount"), t("deleteExplanation"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("requestDelete"),
              style: "destructive",
              onPress: () =>
                void action.run(async () => {
                  const result = await auth.$fetch("/installation/request-deletion", {
                    method: "POST",
                  });
                  if (result.error) throw result.error;
                  Alert.alert(t("deletionRequested"));
                }),
            },
          ])
        }
      />
      {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
    </Screen>
  );
}
