import { Text } from "@/components/typography";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { ExternalLink, Swords, Shield } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Button, Card, Loading, Panel, Screen, Stats, marks } from "@/components/ui";
import { ElementBadge } from "@/components/element";
import { Select } from "@/components/select";
import { formatPt } from "@/lib/format";
const labels: Record<string, string> = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  double_rare: "ダブルレア",
  legendary: "レジェンド",
};
export default function Detail() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const trpc = useTRPC();
  const q = useQuery(trpc.card.get.queryOptions({ cardId }));
  const [selected, setSelected] = useState("");
  const d = q.data;
  const first =
    d?.ownedCopies.find((c) => c.id === selected && !c.inTeam)?.id ??
    (selected ? undefined : d?.ownedCopies.find((c) => !c.inTeam)?.id);
  return (
    <Screen title="" back contentStyle={{ gap: 0, paddingTop: 24 }}>
      {!d ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        <>
          <View style={{ alignItems: "center", paddingHorizontal: 9 }}>
            <Card
              card={d.card}
              size="lg"
              elementBadge={<ElementBadge element={d.card.element} />}
            />
          </View>
          <Panel
            style={{ marginTop: 24, padding: 20, gap: 8, backgroundColor: "rgba(255,255,255,.85)" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ElementBadge element={d.card.element} />
                <Text
                  style={{
                    flexShrink: 1,
                    fontSize: 20,
                    lineHeight: 28,
                    fontWeight: "900",
                    color: "#1e293b",
                  }}
                >
                  {d.card.title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Wikipediaで読む（新しいタブで開く）"
                  onPress={() => void Linking.openURL(d.card.wikiUrl)}
                  style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <ExternalLink size={16} color="#0284c7" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>
                {marks[d.card.rarity]} {labels[d.card.rarity]}
              </Text>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              月間{" "}
              {d.card.monthlyPageviews >= 10000
                ? `${(d.card.monthlyPageviews / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万`
                : d.card.monthlyPageviews.toLocaleString("ja-JP")}{" "}
              閲覧
            </Text>
            <Stats attack={d.card.monthlyPageviews} defense={d.card.articleLength} prominent />
            <Text style={{ fontSize: 14, lineHeight: 22.75, color: "#334155" }}>
              {d.card.summary}
            </Text>
          </Panel>
          <Panel
            style={{ marginTop: 16, padding: 20, gap: 0, backgroundColor: "rgba(255,255,255,.85)" }}
          >
            <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#334155" }}>
              所持 {d.ownedCopies.length}枚
              {d.listedCount > 0 ? `（ほかに出品中 ${d.listedCount}枚）` : ""}
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {d.ownedCopies.map((c) => (
                <View
                  key={c.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap" }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 16, color: "#475569" }}>
                    #{c.id.slice(-5)}
                  </Text>
                  <Swords size={12} color="#ea580c" />
                  <Text style={{ fontSize: 12, lineHeight: 16, color: "#475569" }}>
                    +{c.attackBonus.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
                  </Text>
                  <Shield size={12} color="#0284c7" />
                  <Text style={{ fontSize: 12, lineHeight: 16, color: "#475569" }}>
                    +{c.defenseBonus.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
                    {c.inTeam ? " · 編成中" : ""}
                  </Text>
                </View>
              ))}
            </View>
            {!!d.ownedCopies.length && (
              <View style={{ marginTop: 12, gap: 4 }}>
                <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>出品する1枚</Text>
                <Select
                  label="出品する1枚"
                  value={selected || first || ""}
                  options={[
                    { value: "", label: "カードを選ぶ" },
                    ...d.ownedCopies.map((c) => ({
                      value: c.id,
                      label: `#${c.id.slice(-5)} ⚔ +${c.attackBonus} / 🛡 +${c.defenseBonus}${c.inTeam ? "（編成中）" : ""}`,
                      disabled: c.inTeam,
                    })),
                  ]}
                  onChange={setSelected}
                />
              </View>
            )}
            <Button
              variant="link"
              title="チームを編成・カードを合成する →"
              style={{ marginTop: 12, alignItems: "flex-start" }}
              textStyle={{ color: "#0369a1" }}
              onPress={() => router.push("/battle")}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Button
                title="出品する"
                disabled={!first}
                style={{ flex: 1, height: 44, paddingVertical: 12 }}
                onPress={() =>
                  first &&
                  router.push({ pathname: "/market/new", params: { userCardId: first, cardId } })
                }
              />
            </View>
            {d.lowestMarketPrice !== null && (
              <Button
                variant="link"
                title={`マーケットの最安値 ${formatPt(d.lowestMarketPrice)} ›`}
                style={{ marginTop: 12 }}
                textStyle={{ fontSize: 12, color: "#64748b" }}
                onPress={() =>
                  router.push({ pathname: "/market", params: { cardId, format: "fixed_price" } })
                }
              />
            )}
          </Panel>
        </>
      )}
    </Screen>
  );
}
