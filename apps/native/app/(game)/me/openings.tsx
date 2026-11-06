import { Text } from "../../../components/typography";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/client";
import { Loading, Screen, marks } from "../../../components/ui";
import { formatDateTime } from "../../../lib/format";
export default function Openings() {
  const trpc = useTRPC();
  const q = useQuery(trpc.opening.list.queryOptions());
  return (
    <Screen title="開封履歴" back contentStyle={{ gap: 8 }}>
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : !q.data.openings.length ? (
        <Text
          style={{
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,.8)",
            padding: 24,
            textAlign: "center",
            fontSize: 12,
            lineHeight: 16,
            color: "#94a3b8",
          }}
        >
          まだ開封していません
        </Text>
      ) : (
        q.data.openings.map((o) => (
          <View
            key={o.id}
            style={{
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,.9)",
              padding: 16,
              boxShadow: "0 1px 2px #0000000d",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}>
                {o.packName}
              </Text>
              <Text style={{ fontSize: 11, lineHeight: 16.5, color: "#94a3b8" }}>
                {formatDateTime(o.createdAt)}
              </Text>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {o.cards.map((c, i) => (
                <Text
                  key={i}
                  style={{
                    fontSize: 11,
                    lineHeight: 16.5,
                    color: "#1e293b",
                    borderRadius: 999,
                    backgroundColor: "#f1f5f9",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  {o.revealed ? c.title : "？"}{" "}
                  {o.revealed && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: c.rarity === "legendary" ? "#f59e0b" : "#64748b",
                      }}
                    >
                      {marks[c.rarity]}
                    </Text>
                  )}
                </Text>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push(o.revealed ? `/openings/${o.id}/result` : `/openings/${o.id}`)
              }
              style={{ marginTop: 8 }}
            >
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "700",
                  color: o.revealed ? "#0284c7" : "#7c3aed",
                }}
              >
                {o.revealed ? "結果を見る ›" : "続きを見る ›"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </Screen>
  );
}
