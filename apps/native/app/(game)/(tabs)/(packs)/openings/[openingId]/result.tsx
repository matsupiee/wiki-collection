import { packText } from "@/lib/pack-text";
import { useTranslation } from "@/lib/i18n";
import { useGameSound } from "@/lib/game-sounds";
import { Text } from "@/components/typography";
import { useEffect } from "react";
import { Platform, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Button, Card, Loading } from "@/components/ui";
import { AppBackground } from "@/components/app-background";
import { SafeAreaView } from "react-native-screens/experimental";
export default function Result() {
  const t = useTranslation();
  const playSound = useGameSound();
  const { openingId, newIds = "" } = useLocalSearchParams<{ openingId: string; newIds?: string }>();
  const trpc = useTRPC();
  const q = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const open = useMutation(trpc.pack.open.mutationOptions());
  const action = useAction();
  useEffect(() => {
    if (q.data && !q.data.opening.revealedAt) reveal.mutate({ openingId });
  }, [q.data?.opening.id]);
  return (
    <SafeAreaView edges={{ bottom: Platform.OS === "ios" }} style={{ flex: 1 }}>
      <AppBackground />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          width: "100%",
          maxWidth: 448,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: 32,
          paddingBottom: 28,
        }}
      >
        {!q.data ? (
          <Loading error={q.error} retry={q.refetch} />
        ) : (
          <>
            <Text
              style={{
                fontSize: 20,
                lineHeight: 28,
                fontWeight: "900",
                textAlign: "center",
                color: "#334155",
              }}
            >
              {t("results")}
            </Text>
            <LinearGradient
              colors={["#7dd3fc", "#c4b5fd", "#fde68a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 4, borderRadius: 999, marginTop: 8 }}
            />
            <Text
              style={{
                fontSize: 12,
                lineHeight: 16,
                textAlign: "center",
                color: "#64748b",
                marginTop: 8,
              }}
            >
              {packText(q.data.pack.slug, "name", q.data.pack.name)}
            </Text>
            {q.data.questRewards.length > 0 && (
              <Text
                accessibilityRole="text"
                style={{ textAlign: "center", color: "#047857", marginTop: 16, fontWeight: "700" }}
              >
                {t("questResult", {
                  count: q.data.questRewards.length,
                  amount: q.data.questRewards.reduce((sum, r) => sum + r.amount, 0),
                })}
              </Text>
            )}
            <View style={{ marginTop: 24, gap: 16, alignItems: "center" }}>
              {[q.data.cards.slice(0, 3), q.data.cards.slice(3)].map((row, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  {row.map((c) => (
                    <View key={c.userCardId} style={{ width: 112, maxWidth: "31.3%" }}>
                      {newIds.split(",").includes(c.userCardId) && (
                        <View
                          style={{
                            position: "absolute",
                            top: -8,
                            left: -4,
                            zIndex: 10,
                            borderRadius: 999,
                            backgroundColor: "#ec4899",
                            paddingHorizontal: 6,
                            boxShadow: "0 1px 3px #0003",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              lineHeight: 15,
                              fontWeight: "900",
                              color: "white",
                            }}
                          >
                            NEW
                          </Text>
                        </View>
                      )}
                      <Card
                        card={c.card}
                        small
                        onPress={() => {
                          playSound("card");
                          router.push(`/cards/${c.card.id}`);
                        }}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <View style={{ marginTop: "auto", paddingTop: 32, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <LinearGradient
                  colors={["#38bdf8", "#22d3ee"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1.12, flexBasis: 0, borderRadius: 999 }}
                >
                  <Button
                    title={action.pending ? t("preparing") : t("oneMore")}
                    textStyle={{ fontSize: 12, fontWeight: "800" }}
                    disabled={action.pending}
                    style={{
                      backgroundColor: "transparent",
                      height: 48,
                      justifyContent: "center",
                    }}
                    onPress={() =>
                      void action.run(async () => {
                        const result = await open.mutateAsync({ packId: q.data!.pack.id });
                        router.replace({
                          pathname: "/openings/[openingId]",
                          params: {
                            openingId: result.openingId,
                            newIds: result.newUserCardIds.join(","),
                          },
                        });
                      })
                    }
                  />
                </LinearGradient>
                <Button
                  secondary
                  title={t("toCollection")}
                  textStyle={{ fontSize: 12, fontWeight: "800" }}
                  style={{
                    flex: 1,
                    flexBasis: 0,
                    height: 48,
                    paddingHorizontal: 0,
                    justifyContent: "center",
                  }}
                  onPress={() => router.replace("/collection")}
                />
              </View>
              <Button
                variant="link"
                title={t("toPacks")}
                textStyle={{ fontSize: 12, color: "#64748b" }}
                onPress={() => router.replace("/packs")}
              />
              {!!action.error && (
                <Text accessibilityRole="alert" style={{ color: "#e11d48" }}>
                  {action.error}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
