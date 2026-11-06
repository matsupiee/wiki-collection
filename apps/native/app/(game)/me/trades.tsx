import { Text } from "../../../components/typography";
import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/client";
import { Loading, Screen, marks } from "../../../components/ui";
import { formatDuration, formatPt } from "../../../lib/format";
const labels = { active: "出品中", sold: "取引成立", cancelled: "取り下げ", expired: "期限切れ" };
export default function Trades() {
  const trpc = useTRPC();
  const q = useQuery(trpc.market.listMine.queryOptions());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Screen title="出品・入札の管理" back>
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        (
          [
            ["selling", "出品したもの"],
            ["bidding", "入札中"],
            ["bought", "買ったもの"],
          ] as const
        ).map(([key, label]) => (
          <View key={key}>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "800",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              {label}
            </Text>
            {!q.data[key].length ? (
              <Text
                style={{
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,.8)",
                  padding: 16,
                  textAlign: "center",
                  fontSize: 12,
                  lineHeight: 16,
                  color: "#94a3b8",
                }}
              >
                ありません
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {q.data[key].map((l) => (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/market/${l.id}`)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,.9)",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      boxShadow: "0 1px 2px #0000000d",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        {l.card.title}{" "}
                        <Text
                          style={{
                            fontSize: 12,
                            color: l.card.rarity === "legendary" ? "#f59e0b" : "#64748b",
                          }}
                        >
                          {marks[l.card.rarity]}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                        {l.format === "auction" ? "オークション" : "フリマ"}・{labels[l.status]}
                        {l.status === "active" && l.endsAt
                          ? `・残り ${formatDuration(new Date(l.endsAt).getTime() - now)}`
                          : ""}
                        {"isLeading" in l ? (l.isLeading ? "・最高額" : "・抜かれました") : ""}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: 16, lineHeight: 24, fontWeight: "900", color: "#1e293b" }}
                    >
                      {formatPt(l.price)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}
