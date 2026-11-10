import { useQuery } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/typography";
import { Loading, Screen, styles } from "@/components/ui";
import { useTRPC } from "@/lib/client";

export default function AssetRanking() {
  const trpc = useTRPC();
  const pathname = usePathname();
  const ranking = useQuery({
    ...trpc.card.assetRanking.queryOptions(),
    enabled: pathname === "/asset-ranking",
    staleTime: 0,
  });
  const data = ranking.data;
  return (
    <Screen title="総合資産ランキング">
      {!data ? (
        <Loading error={ranking.error} retry={ranking.refetch} />
      ) : (
        <>
          <View style={styles.panel}>
            <Text style={styles.muted}>あなたのカード資産</Text>
            <Text style={styles.title}>
              {data.mine
                ? `${data.mine.rank}位　${data.mine.total.toLocaleString()}点`
                : "未参加　0点"}
            </Text>
            <Text style={styles.muted}>
              {data.mine
                ? "月間閲覧数と記事の長さから、所持カード1枚ずつの点数を合計します。出品中のカードも含みます。"
                : "カードを1枚獲得するとランキングに参加できます。"}
            </Text>
          </View>
          <View style={styles.panel}>
            <Text style={styles.title}>上位50人</Text>
            {data.leaders.length === 0 && <Text style={styles.muted}>まだ参加者がいません。</Text>}
            {data.leaders.map((row, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[styles.muted, { minWidth: 36 }]}>{row.rank}位</Text>
                <Text style={[styles.text, { flex: 1, fontWeight: row.mine ? "800" : "500" }]}>
                  {row.name}
                  {row.mine ? "（あなた）" : ""}
                </Text>
                <Text style={[styles.text, { fontWeight: "700" }]}>
                  {row.total.toLocaleString()}点
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
