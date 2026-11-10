import { Text } from "@/components/typography";
import { useState } from "react";
import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { openLegalPage } from "@/lib/legal-browser";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Confirm, Loading, Screen } from "@/components/ui";
import { formatPt, formatPrice } from "@/lib/format";
const note = { fontSize: 11, lineHeight: 17.875, color: "#64748b" };
export default function Point() {
  const trpc = useTRPC();
  const q = useQuery(trpc.shop.listProducts.queryOptions());
  const b = useQuery(trpc.coin.getBalance.queryOptions());
  const purchase = useMutation(trpc.shop.purchase.mutationOptions());
  const action = useAction();
  const [selected, setSelected] = useState("");
  const p = q.data?.products.find((p) => p.id === selected);
  return (
    <Screen title="ポイント購入">
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
              pt 残高
            </Text>
            <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#1e293b" }}>
              {formatPt(b.data.total)}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              有償 {formatPt(b.data.paid)}・無償 {formatPt(b.data.free)}
            </Text>
          </LinearGradient>
          <View style={{ gap: 8 }}>
            {q.data.products.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${formatPt(p.coins)} ${formatPrice(p.priceAmount, p.currency)}`}
                disabled={!q.data.purchasable}
                onPress={() => setSelected(p.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,.9)",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  boxShadow: "0 1px 2px #0000000d",
                  opacity: q.data.purchasable ? 1 : 0.5,
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
                  {formatPrice(p.priceAmount, p.currency)}
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
              {q.data.purchasable
                ? "開発環境のため、実際の支払いは行われません。"
                : "現在 pt は購入できません。"}
            </Text>
            <Text style={note}>
              購入した pt は払い戻しできません。pt
              は有料パックの開封とマーケットでの購入・入札に使えます。
            </Text>
            <Text style={note}>支払いは無償 pt から先に使われます。</Text>
            <View style={{ flexDirection: "row", gap: 12, paddingTop: 8 }}>
              {(
                [
                  ["/legal/tokushoho", "特定商取引法に基づく表記"],
                  ["/legal/payment-services", "資金決済法に基づく表示"],
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
          title="pt を購入します"
          confirmLabel="購入する"
          pending={action.pending}
          onCancel={() => setSelected("")}
          onConfirm={() =>
            void action.run(
              () => purchase.mutateAsync({ productId: p.id }),
              () => setSelected(""),
            )
          }
        >
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569", textAlign: "center" }}>
            {formatPt(p.coins)} を {formatPrice(p.priceAmount, p.currency)} で購入します。
          </Text>
          {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
        </Confirm>
      )}
    </Screen>
  );
}
