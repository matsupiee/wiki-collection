import { Text } from "@/components/typography";
import { useState } from "react";
import { Pressable, View, ScrollView, Modal, useWindowDimensions } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { router } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Button, Card, Loading, Screen } from "@/components/ui";
import { rarities, type Rarity } from "@wiki-collection/db/enums";
const rarityLabels = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  double_rare: "ダブルレア",
  legendary: "レジェンド",
};
const sortOptions = [
  ["acquired", "引いた順"],
  ["monthlyPageviews", "閲覧数順"],
  ["articleLength", "記事サイズ順"],
] as const;
export default function Collection() {
  const trpc = useTRPC();
  const { width } = useWindowDimensions();
  const cellWidth = (Math.min(width, 448) - 32 - 24) / 3;
  const [rarity, setRarity] = useState<Rarity>();
  const [sort, setSort] = useState<"acquired" | "monthlyPageviews" | "articleLength">("acquired");
  const [sortOpen, setSortOpen] = useState(false);
  const q = useQuery({
    ...trpc.card.listOwned.queryOptions({ sort, rarity }),
    placeholderData: keepPreviousData,
  });
  return (
    <Screen title="コレクション" contentStyle={{ gap: 0, paddingBottom: 24 }}>
      <Button
        title="総合資産ランキング"
        variant="link"
        style={{ alignSelf: "flex-end" }}
        onPress={() => router.push("/asset-ranking")}
      />
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1, minWidth: 0 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {[undefined, ...rarities].map((r) => (
                <Button
                  key={r ?? "all"}
                  title={r ? rarityLabels[r] : "すべて"}
                  variant="chip"
                  style={{ backgroundColor: rarity === r ? "#1e293b" : "white" }}
                  textStyle={{ color: rarity === r ? "white" : "#64748b" }}
                  onPress={() => setRarity(r)}
                />
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="並び順"
              onPress={() => setSortOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderRadius: 999,
                backgroundColor: "white",
                paddingHorizontal: 8,
                paddingVertical: 4,
                boxShadow: "0 1px 2px #0000000d",
              }}
            >
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: "#334155" }}>
                {sortOptions.find(([value]) => value === sort)?.[1]}
              </Text>
              <ChevronDown size={12} color="#334155" />
            </Pressable>
          </View>
          {q.data.cards.length === 0 ? (
            <View
              style={{
                padding: 32,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,.8)",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b" }}>
                まだカードがありません。
              </Text>
              <Button
                title="パックを開けよう"
                variant="link"
                onPress={() => router.push("/packs")}
                style={{ marginTop: 8 }}
                textStyle={{ fontWeight: "700" }}
              />
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}
            >
              {q.data.cards.map((c) => (
                <View key={c.id} style={{ width: cellWidth, alignItems: "flex-start" }}>
                  <Card
                    card={c}
                    size="sm"
                    ownedCount={c.ownedCount}
                    onPress={() => router.push(`/cards/${c.id}`)}
                  />
                  {c.listedCount > 0 && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        lineHeight: 16,
                        fontWeight: "700",
                        color: "#d97706",
                      }}
                    >
                      出品中{c.listedCount}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
      {sortOpen && (
        <Modal transparent visible onRequestClose={() => setSortOpen(false)} animationType="fade">
          <Pressable
            accessible={false}
            onPress={() => setSortOpen(false)}
            style={{
              flex: 1,
              backgroundColor: "#0f172a40",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 300,
                backgroundColor: "white",
                borderRadius: 16,
                padding: 8,
              }}
            >
              {sortOptions.map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => {
                    setSort(value);
                    setSortOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "700" }}>{label}</Text>
                  {value === sort && <Check size={16} color="#0284c7" />}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </Screen>
  );
}
