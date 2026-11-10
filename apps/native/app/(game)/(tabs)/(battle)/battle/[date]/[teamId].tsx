import { Text } from "@/components/typography";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fight } from "@wiki-collection/db/battle";
import { useTRPC } from "@/lib/client";
import { Button, Screen, Stats } from "@/components/ui";
import { ElementBadge } from "@/components/element";
import { Match, outcome } from "@/components/match";
const text = { fontSize: 16, lineHeight: 24, color: "#1e293b" };
export default function Result() {
  const { date, teamId, mine } = useLocalSearchParams<{
    date: string;
    teamId: string;
    mine?: string;
  }>();
  const trpc = useTRPC();
  const q = useQuery(trpc.battle.ranking.queryOptions({ date }));
  const team = q.data?.ranking.find((t) => t.id === teamId);
  const count = team ? team.wins + team.losses + team.draws : 0;
  const opponents = q.data?.ranking.filter((t) => t.userId !== team?.userId) ?? [];
  const [expanded, setExpanded] = useState<string[]>([]);
  return (
    <Screen contentStyle={{ paddingTop: 36, gap: 24 }}>
      <Button
        title="← ランキングに戻る"
        secondary
        style={{
          alignSelf: "flex-start",
          minHeight: 44,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: "transparent",
        }}
        textStyle={{ fontWeight: "600" }}
        onPress={() =>
          router.push({
            pathname: "/battle",
            params: { tab: "ranking", date, ...(mine ? { mine } : {}) },
          })
        }
      />
      {q.isPending ? (
        <Text accessibilityRole="progressbar" style={text}>
          対戦結果を読み込み中…
        </Text>
      ) : q.isError ? (
        <View accessibilityRole="alert">
          <Text style={text}>対戦結果を読み込めませんでした。</Text>
          <Button
            title="再試行"
            secondary
            style={{ alignSelf: "flex-start", borderRadius: 12 }}
            onPress={() => void q.refetch()}
          />
        </View>
      ) : !team ? (
        <Text style={text}>このチームの対戦記録はありません。</Text>
      ) : (
        <>
          <View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b" }}>
              {date}（日本時間） · {team.rank}位
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 24,
                lineHeight: 32,
                fontWeight: "900",
                color: "#1e293b",
              }}
            >
              {team.name}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: "#64748b" }}>
              {team.player}
            </Text>
          </View>
          <View
            accessibilityLabel="戦績"
            style={{ gap: 8, borderRadius: 16, backgroundColor: "white", padding: 16 }}
          >
            <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: "700", color: "#0369a1" }}>
              {team.points}点
            </Text>
            <Text style={text}>
              {team.wins}勝 {team.losses}敗 {team.draws}分 · {count}戦
            </Text>
            <Text style={text}>
              勝率 {count ? `${((team.wins / count) * 100).toFixed(1)}%` : "—"}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b" }}>
              勝点率 {count ? `${((team.points / (count * 3)) * 100).toFixed(1)}%` : "—"}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", color: "#1e293b" }}>
              対戦時のカード
            </Text>
            <View style={{ marginTop: 8 }}>
              {team.members.map((m, i) => (
                <View
                  key={`${m.id}-${i}`}
                  style={{
                    gap: 8,
                    paddingVertical: 16,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                    {i + 1}番手
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <ElementBadge element={m.element} ruleVersion={team.ruleVersion ?? 1} />
                    <Text style={[text, { fontWeight: "700", flex: 1, minWidth: 0 }]}>
                      {m.title}
                    </Text>
                  </View>
                  <Stats attack={m.attack} defense={m.defense} />
                </View>
              ))}
            </View>
          </View>
          <View>
            <Text
              style={{
                fontSize: 18,
                lineHeight: 28,
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              対戦の内訳
            </Text>
            {opponents.map((o) => {
              const open = expanded.includes(o.id);
              return (
                <View
                  key={o.id}
                  style={{ borderTopWidth: 1, borderColor: "#e2e8f0", paddingVertical: 12 }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() =>
                      setExpanded((ids) =>
                        open ? ids.filter((id) => id !== o.id) : [...ids, o.id],
                      )
                    }
                    style={{
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, lineHeight: 20, color: "#1e293b" }}>
                      {open ? "▼" : "▶"}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        lineHeight: 20,
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {outcome(fight(team.members, o.members, team.ruleVersion ?? 1))} · {o.player}{" "}
                      / {o.name}
                    </Text>
                  </Pressable>
                  {open && (
                    <Match
                      left={team.members}
                      right={o.members}
                      ruleVersion={team.ruleVersion ?? 1}
                      leftLabel={team.name}
                    />
                  )}
                </View>
              );
            })}
            {!opponents.length && <Text style={text}>この日は対戦相手がいませんでした。</Text>}
          </View>
        </>
      )}
    </Screen>
  );
}
