import { Text, TextInput } from "@/components/typography";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Search } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { Card, Loading, Screen } from "@/components/ui";
import { formatDuration, formatPt } from "@/lib/format";
const sortOptions = [
  ["ending_soon", "終了が近い順"],
  ["most_bids", "入札が多い順"],
  ["price_asc", "安い順"],
] as const;
const rarityMarks = {
  common: "◇",
  uncommon: "◇◇",
  rare: "◇◇◇",
  double_rare: "◇◇◇◇",
  legendary: "☆",
};
export default function Market() {
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();
  const trpc = useTRPC();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"price_asc" | "ending_soon" | "most_bids">("ending_soon");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const q = useQuery(
    trpc.market.list.queryOptions({
      format: "auction",
      query: query || undefined,
      sort,
      cardId,
    }),
  );
  return (
    <Screen title="オークション" contentStyle={{ gap: 12, paddingBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: "white",
          boxShadow: "0 1px 2px #0000000d",
        }}
      >
        <Search size={16} color="#94a3b8" />
        <TextInput
          accessibilityLabel="カード名で検索"
          placeholder="カード名で検索"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            fontSize: 14,
            lineHeight: 20,
            color: "#334155",
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {sortOptions.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            onPress={() => setSort(key)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: sort === key ? "#1e293b" : "white",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "700",
                color: sort === key ? "white" : "#64748b",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
        {!!cardId && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.setParams({ cardId: undefined })}
            style={{ marginLeft: "auto" }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0284c7" }}>
              絞り込みを解除
            </Text>
          </Pressable>
        )}
      </View>
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : q.data.listings.length === 0 ? (
        <View style={{ padding: 32, borderRadius: 24, backgroundColor: "rgba(255,255,255,.8)" }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" }}>
            出品はまだありません
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {q.data.listings.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={`${l.card.title} ${formatPt(l.price)}`}
              onPress={() => router.push(`/market/${l.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 16,
                padding: 8,
                backgroundColor: "rgba(255,255,255,.9)",
                boxShadow: "0 1px 2px #0000000d",
              }}
            >
              <View style={{ width: 64 }}>
                <Card card={l.card} size="xs" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}
                >
                  {l.card.title}{" "}
                  <Text
                    style={{
                      fontSize: 12,
                      color: l.card.rarity === "legendary" ? "#f59e0b" : "#64748b",
                    }}
                  >
                    {rarityMarks[l.card.rarity]}
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                  出品者 {l.sellerName}
                  {l.isMine && (
                    <Text style={{ fontWeight: "700", color: "#d97706" }}> 自分の出品</Text>
                  )}
                </Text>
                {l.format === "auction" && l.endsAt && (
                  <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                    入札 {l.bidCount}件・残り {formatDuration(new Date(l.endsAt).getTime() - now)}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {l.format === "auction" && (
                  <Text style={{ fontSize: 10, lineHeight: 15, color: "#94a3b8" }}>現在</Text>
                )}
                <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "900", color: "#1e293b" }}>
                  {formatPt(l.price)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
