import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/typography";
import { Loading, Screen } from "@/components/ui";
import { useTRPC } from "@/lib/client";
import { useTranslation } from "@/lib/i18n";
import { questCondition, questTitle } from "@/lib/quest-text";
import { formatPt } from "@/lib/format";

export default function Quests() {
  const trpc = useTRPC();
  const t = useTranslation();
  const q = useQuery(trpc.quest.list.queryOptions());
  return (
    <Screen showNotifications={false} title={t("quests")} back>
      {!q.data ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        <>
          <Text style={{ color: "#64748b", fontSize: 13 }}>{t("questAuto")}</Text>
          <Text style={{ color: "#334155", fontWeight: "700" }}>
            {t("questTotal", {
              done: q.data.quests.filter((r) => r.completedAt).length,
              total: q.data.quests.length,
            })}
          </Text>
          <View style={{ backgroundColor: "white", borderRadius: 20, overflow: "hidden" }}>
            {q.data.quests.map((quest, i) => (
              <View
                key={quest.id}
                style={{ padding: 18, gap: 8, borderTopWidth: i ? 1 : 0, borderColor: "#f1f5f9" }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ flex: 1, color: "#1e293b", fontWeight: "700" }}>
                    {questTitle(quest.group, quest.target, quest.metric)}
                  </Text>
                  <Text style={{ color: "#047857", fontWeight: "700" }}>
                    +{formatPt(quest.reward)}
                  </Text>
                </View>
                <Text style={{ color: "#475569", fontSize: 13 }}>
                  {questCondition(quest.metric, quest.target)}
                </Text>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: quest.target, now: quest.progress }}
                  accessibilityLabel={questCondition(quest.metric, quest.target)}
                  style={{ height: 4, backgroundColor: "#e2e8f0", borderRadius: 2 }}
                >
                  <View
                    style={{
                      height: 4,
                      width: `${(quest.progress / quest.target) * 100}%`,
                      backgroundColor: quest.completedAt ? "#059669" : "#0284c7",
                      borderRadius: 2,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 12, color: quest.completedAt ? "#047857" : "#64748b" }}>
                  {quest.completedAt
                    ? t("questGranted")
                    : quest.progress >= quest.target
                      ? t("questPending")
                      : `${quest.progress} / ${quest.target}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
