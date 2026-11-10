import { Text } from "@/components/typography";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Loading, Screen } from "@/components/ui";
import { formatDateTime, formatPt } from "@/lib/format";
const labels: Record<string, string> = {
  purchase: "購入",
  market_sale: "マーケットの売上",
  bid_refund: "入札の返金",
  admin_grant: "運営からの付与",
  pack_open: "パックの開封",
  market_buy: "マーケットで購入",
  auction_bid: "オークションに入札",
  admin_revoke: "運営による調整",
};
const panel = {
  borderRadius: 24,
  backgroundColor: "rgba(255,255,255,.9)",
  boxShadow: "0 1px 2px #0000000d",
};
export default function Wallet() {
  const trpc = useTRPC();
  const q = useQuery(trpc.coin.listHistory.queryOptions());
  const b = useQuery(trpc.coin.getBalance.queryOptions());
  return (
    <Screen title="pt の履歴" back>
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
              有償 {formatPt(b.data.paid)}・無償 {formatPt(b.data.free)}
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
                履歴はありません
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
                      {labels[e.kind === "deposit" ? e.source : e.purpose]}
                    </Text>
                    <Text style={{ fontSize: 11, lineHeight: 16.5, color: "#94a3b8" }}>
                      {formatDateTime(e.createdAt)}
                      {e.kind === "deposit"
                        ? `・${e.isPaid ? "有償" : "無償"}`
                        : `・有償 ${e.paidAmount} / 無償 ${e.freeAmount}`}
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
