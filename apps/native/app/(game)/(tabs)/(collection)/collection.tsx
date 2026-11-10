import { useGameSound } from "@/lib/game-sounds";
import { Text } from "@/components/typography";
import { useState } from "react";
import { Pressable, View, ScrollView, Modal, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpDown, Check } from "lucide-react-native";
import { router } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Button, Card, Loading, Screen } from "@/components/ui";
import { rarities, type Rarity } from "@wiki-collection/db/enums";
import { rarityLabels } from "@/lib/rarity";
const sortOptions = [
  ["acquired", "引いた順"],
  ["monthlyPageviews", "閲覧数順"],
  ["articleLength", "記事サイズ順"],
] as const;
export default function Collection() {
  const playSound = useGameSound();
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
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1, minWidth: 0 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 12 }}
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
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(51,65,85,0)", "rgba(51,65,85,0.12)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: 10, marginLeft: -10, alignSelf: "stretch" }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="並び順"
              onPress={() => setSortOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                alignSelf: "stretch",
                borderLeftWidth: 1,
                borderLeftColor: "rgba(51,65,85,0.22)",
                paddingLeft: 10,
                paddingRight: 2,
              }}
            >
              <ArrowUpDown size={14} color="#334155" />
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: "#334155" }}>
                {sortOptions.find(([value]) => value === sort)?.[1]}
              </Text>
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
                    onPress={() => {
                      playSound("card");
                      router.push(`/cards/${c.id}`);
                    }}
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
