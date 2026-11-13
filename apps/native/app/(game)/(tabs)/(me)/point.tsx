import { useTranslation } from "@/lib/i18n";
import { useAppleStatus } from "@/lib/apple-account";
import { store, ios, deliver, usePointCatalog } from "@/lib/point-store";
import { auth, useTRPC } from "@/lib/client";
import { Text } from "@/components/typography";
import { useState } from "react";
import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { openLegalPage } from "@/lib/legal-browser";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAction } from "@/lib/mutation";
import { Confirm, Loading, Screen } from "@/components/ui";
import { formatPt } from "@/lib/format";
const note = { fontSize: 11, lineHeight: 17.875, color: "#64748b" };
export default function Point() {
  const t = useTranslation();
  const trpc = useTRPC();
  const session = auth.useSession();
  const apple = useAppleStatus(session.data?.user.id);
  const q = usePointCatalog(session.data?.user.id);
  const ids = q.data?.products.map((product) => product.sku) ?? [];
  const prices = useQuery({
    queryKey: ["store-prices", ids],
    enabled: !!store && !!q.data?.storeEnabled && ids.length > 0,
    queryFn: () => store!.prices(ids),
  });
  const price = (product: NonNullable<typeof q.data>["products"][number]) =>
    ios
      ? q.data?.storeEnabled && store
        ? prices.data?.[product.sku]
        : undefined
      : q.data?.purchasable
        ? t("testPurchase")
        : undefined;
  const [message, setMessage] = useState("");
  const b = useQuery(trpc.coin.getBalance.queryOptions());
  const purchase = useMutation(trpc.shop.purchase.mutationOptions());
  const action = useAction();
  const [selected, setSelected] = useState("");
  const p = q.data?.products.find((p) => p.id === selected);
  return (
    <Screen title={t("buyPoints")}>
      {!q.data || !b.data ? (
        <Loading
          error={q.error ?? b.error}
          retry={() => {
            void q.refetch();
            void b.refetch();
          }}
        />
      ) : (
        <>
          <LinearGradient
            colors={["#fef3c7", "#ffffff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 20, boxShadow: "0 1px 2px #0000000d" }}
          >
            <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: "#64748b" }}>
              {t("pointBalance")}
            </Text>
            <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#1e293b" }}>
              {formatPt(b.data.total)}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              {t("paidAndFree", { paid: formatPt(b.data.paid), free: formatPt(b.data.free) })}
            </Text>
          </LinearGradient>
          <View style={{ gap: 8 }}>
            {q.data.products.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${formatPt(p.coins)} ${price(p) ?? t("unavailable")}`}
                disabled={!price(p) || action.pending}
                onPress={() => {
                  setMessage("");
                  action.clearError();
                  setSelected(p.id);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,.9)",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  boxShadow: "0 1px 2px #0000000d",
                  opacity: price(p) ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 18, lineHeight: 28, fontWeight: "900", color: "#1e293b" }}>
                  {formatPt(p.coins)}
                </Text>
                <Text
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#0ea5e9",
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    fontSize: 14,
                    lineHeight: 20,
                    fontWeight: "800",
                    color: "white",
                  }}
                >
                  {price(p) ?? t("unavailable")}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 4 }}>
            <Text
              style={[
                note,
                { fontWeight: "700", color: q.data.purchasable ? "#d97706" : "#f43f5e" },
              ]}
            >
              {ios
                ? prices.isFetching
                  ? t("loadingPrices")
                  : ids.some((id) => prices.data?.[id])
                    ? ""
                    : t("purchasesUnavailable")
                : q.data.purchasable
                  ? t("developmentPayment")
                  : t("purchasesUnavailable")}
            </Text>
            {ios &&
              q.data.storeEnabled &&
              !prices.isFetching &&
              !ids.some((id) => prices.data?.[id]) && (
                <Pressable
                  onPress={() => {
                    void q.refetch();
                    if (store) void prices.refetch();
                  }}
                >
                  <Text>{t("reload")}</Text>
                </Pressable>
              )}
            {!!message && <Text accessibilityRole="alert">{message}</Text>}
            <Text style={note}>{t("purchaseTerms")}</Text>
            <Text style={note}>{t("spendFreeFirst")}</Text>
            <View style={{ flexDirection: "row", gap: 12, paddingTop: 8 }}>
              {(
                [
                  ["/legal/tokushoho", t("commercialDisclosure")],
                  ["/legal/payment-services", t("paymentDisclosure")],
                ] as const
              ).map(([url, label]) => (
                <Pressable
                  key={url}
                  accessibilityRole="button"
                  onPress={() => void action.run(() => openLegalPage(url))}
                >
                  <Text style={[note, { fontWeight: "700", color: "#0284c7" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
      {!!action.error && !p && <Text accessibilityRole="alert">{action.error}</Text>}
      {p && (
        <Confirm
          title={t("confirmPurchase")}
          confirmLabel={t("purchase")}
          pending={action.pending}
          onCancel={() => setSelected("")}
          onConfirm={() =>
            void action.run(
              async () => {
                let coins: number;
                if (ios) {
                  const result = await store!.buy(p.sku, q.data!.accountToken);
                  if (result === "cancelled") return;
                  if (result === "pending") {
                    setMessage(t("pendingApproval"));
                    return;
                  }
                  try {
                    coins = await deliver(result);
                  } catch {
                    setMessage(t("paymentReceived"));
                    return;
                  }
                } else {
                  coins = (await purchase.mutateAsync({ productId: p.id })).coins;
                }
                setMessage(t("purchased", { points: formatPt(coins) }));
              },
              () => setSelected(""),
            )
          }
        >
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569", textAlign: "center" }}>
            {ios
              ? t("buyFor", { points: formatPt(p.coins), price: price(p) ?? t("unavailable") })
              : formatPt(p.coins)}
          </Text>
          {ios && apple.data !== true && <Text style={note}>{t("guestWarning")}</Text>}
          {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
        </Confirm>
      )}
    </Screen>
  );
}
