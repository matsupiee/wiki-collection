import { questHistoryLabel } from "@/lib/quest-text";
import { useTranslation } from "@/lib/i18n";
import { Text } from "@/components/typography";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Loading, Screen } from "@/components/ui";
import { formatDateTime, formatPt } from "@/lib/format";

const panel = {
  borderRadius: 24,
  backgroundColor: "rgba(255,255,255,.9)",
  boxShadow: "0 1px 2px #0000000d",
};
export default function Wallet() {
  const t = useTranslation();
  const labels: Record<string, string> = {
    quest_reward: t("questReward"),
    purchase: t("purchaseSource"),
    market_sale: t("saleSource"),
    bid_refund: t("bidRefund"),
    admin_grant: t("grant"),
    pack_open: t("packSpend"),
    market_buy: t("marketSpend"),
    auction_bid: t("auctionSpend"),
    admin_revoke: t("adjustment"),
  };
  const trpc = useTRPC();
  const q = useQuery(trpc.coin.listHistory.queryOptions());
  const b = useQuery(trpc.coin.getBalance.queryOptions());
  return (
    <Screen showNotifications={false} title={t("pointHistory")} back>
      {!b.data || !q.data ? (
        <Loading
          error={b.error ?? q.error}
          retry={() => {
            void b.refetch();
            void q.refetch();
          }}
        />
      ) : (
        <>
          <View style={[panel, { padding: 20 }]}>
            <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#1e293b" }}>
              {formatPt(b.data.total)}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              {t("paidAndFree", { paid: formatPt(b.data.paid), free: formatPt(b.data.free) })}
            </Text>
          </View>
          <View style={[panel, { overflow: "hidden" }]}>
            {!q.data.entries.length ? (
              <Text
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontSize: 12,
                  lineHeight: 16,
                  color: "#94a3b8",
                }}
              >
                {t("noHistory")}
              </Text>
            ) : (
              q.data.entries.map((e, i) => (
                <View
                  key={e.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: "#f1f5f9",
                  }}
                >
                  <View>
                    <Text
                      style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#1e293b" }}
                    >
                      {e.kind === "deposit" && e.questKey
                        ? questHistoryLabel(e.questKey)
                        : labels[e.kind === "deposit" ? e.source : e.purpose]}
                    </Text>
                    <Text style={{ fontSize: 11, lineHeight: 16.5, color: "#94a3b8" }}>
                      {formatDateTime(e.createdAt)}
                      {e.kind === "deposit"
                        ? `・${e.isPaid ? t("paid") : t("free")}`
                        : t("splitPoints", { paid: e.paidAmount, free: e.freeAmount })}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      lineHeight: 24,
                      fontWeight: "900",
                      color: e.kind === "deposit" ? "#059669" : "#f43f5e",
                    }}
                  >
                    {e.kind === "deposit" ? "+" : "-"}
                    {formatPt(e.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
