import { t, type MessageKey } from "./i18n";
const groups: Record<string, MessageKey> = {
  first: "questFirst",
  packs: "questPacks",
  cards: "questCards",
  genres: "questGenres",
  rare: "questRare",
};
const milestones: Record<string, Record<number, MessageKey>> = {
  packs: {
    10: "questPacks10",
    50: "questPacks50",
    100: "questPacks100",
    500: "questPacks500",
    1000: "questPacks1000",
  },
  cards: {
    25: "questCards25",
    100: "questCards100",
    250: "questCards250",
    1000: "questCards1000",
    2500: "questCards2500",
  },
  genres: { 5: "questGenres5", 10: "questGenres10", 25: "questGenres25" },
};
const rareNames: Record<string, MessageKey> = {
  rare: "questLucky",
  super_rare: "questVeryLucky",
  legendary: "questSuperLucky",
};
export function questTitle(group: string, target?: number, metric?: string) {
  if (group === "rare" && metric && rareNames[metric]) return t(rareNames[metric]);
  return t(
    (target === undefined ? undefined : milestones[group]?.[target]) ?? groups[group] ?? "quests",
  );
}
export function questCondition(metric: string, target: number) {
  if (metric === "openings") return t("questOpenCondition", { count: target });
  if (metric === "cards") return t("questCardsCondition", { count: target });
  if (metric === "genres") return t("questGenresCondition", { count: target });
  return t("questRareCondition", {
    rarity: metric === "rare" ? "R" : metric === "super_rare" ? "SR" : t("legendary"),
  });
}
export function questHistoryLabel(key: string) {
  if (key === "first_pack") return questTitle("first");
  if (key.startsWith("first_")) return questTitle("rare", 1, key.slice(6));
  const [group, target] = key.split("_");
  return questTitle(group!, Number(target));
}
