import { auctionRefreshInterval } from "@/lib/auction";
import { useTranslation } from "@/lib/i18n";
import { useGameSound } from "@/lib/game-sounds";
import { Text, TextInput } from "@/components/typography";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Search } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { CardArt, Loading, Screen } from "@/components/ui";
import { formatDuration, formatPt } from "@/lib/format";

export default function Market() {
  const t = useTranslation();
  const sortOptions = [
    ["ending_soon", t("endingSoon")],
    ["most_bids", t("mostBids")],
    ["price_asc", t("lowestFirst")],
  ] as const;
  const playSound = useGameSound();
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
    trpc.market.list.queryOptions(
      {
        format: "auction",
        query: query || undefined,
        sort,
        cardId,
      },
      {
        refetchInterval: (query) => {
          const listings = query.state.data?.listings;
          if (!listings?.length) return false;
          return Math.min(
            ...listings.map((item) => (item.endsAt ? auctionRefreshInterval(item.endsAt) : 15_000)),
          );
        },
      },
    ),
  );
  return (
    <Screen showPoints title={t("auction")} contentStyle={{ gap: 12, paddingBottom: 24 }}>
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
          accessibilityLabel={t("searchCards")}
          placeholder={t("searchCards")}
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
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
              {t("clearFilters")}
            </Text>
          </Pressable>
        )}
      </View>
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : q.data.listings.length === 0 ? (
        <View style={{ padding: 32, borderRadius: 24, backgroundColor: "rgba(255,255,255,.8)" }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" }}>
            {t("noListings")}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12, marginHorizontal: -4 }}>
          {q.data.listings.map((listing) => {
            const remaining = listing.endsAt
              ? t("timeLeft", { time: formatDuration(new Date(listing.endsAt).getTime() - now) })
              : "";
            const price = formatPt(listing.price);
            return (
              <View key={listing.id} style={{ width: "33.333333%", paddingHorizontal: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${listing.card.title} ${remaining} ${price}`}
                  onPress={() => {
                    playSound("card");
                    router.push(`/market/${listing.id}`);
                  }}
                  style={{ gap: 2 }}
                >
                  <CardArt card={listing.card} effectiveSize="sm" />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}
                  >
                    {listing.card.title}
                  </Text>
                  {!!remaining && (
                    <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                      {remaining}
                    </Text>
                  )}
                  <Text
                    style={{ fontSize: 14, lineHeight: 20, fontWeight: "900", color: "#1e293b" }}
                  >
                    {price}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
