import { useTranslation, locale } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/typography";
import { Loading, Screen, styles } from "@/components/ui";
import { useTRPC } from "@/lib/client";

export default function AssetRanking() {
  const t = useTranslation();
  const trpc = useTRPC();
  const pathname = usePathname();
  const ranking = useQuery({
    ...trpc.card.assetRanking.queryOptions(),
    enabled: pathname === "/asset-ranking",
    staleTime: 0,
  });
  const data = ranking.data;
  return (
    <Screen title={t("assetRanking")}>
      {!data ? (
        <Loading error={ranking.error} retry={ranking.refetch} />
      ) : (
        <>
          <View style={styles.panel}>
            <Text style={styles.muted}>{t("yourAssets")}</Text>
            <Text style={styles.title}>
              {data.mine
                ? t("rankAndScore", {
                    rank: data.mine.rank,
                    score: data.mine.total.toLocaleString(locale),
                  })
                : t("unranked")}
            </Text>
            <Text style={styles.muted}>{data.mine ? t("scoreExplanation") : t("joinRanking")}</Text>
          </View>
          <View style={styles.panel}>
            <Text style={styles.title}>{t("topCollectors")}</Text>
            {data.leaders.length === 0 && <Text style={styles.muted}>{t("noCollectors")}</Text>}
            {data.leaders.map((row, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[styles.muted, { minWidth: 36 }]}>
                  {t("rank", { rank: row.rank })}
                </Text>
                <Text style={[styles.text, { flex: 1, fontWeight: row.mine ? "800" : "500" }]}>
                  {row.name}
                  {row.mine ? t("you") : ""}
                </Text>
                <Text style={[styles.text, { fontWeight: "700" }]}>
                  {t("score", { score: row.total.toLocaleString(locale) })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
