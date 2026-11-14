import { t, type MessageKey } from "./i18n";
const groups: Record<string, MessageKey> = {
  first: "questFirst",
  packs: "questPacks",
  cards: "questCards",
  genres: "questGenres",
  rare: "questRare",
};
export function questTitle(group: string) {
  return t(groups[group] ?? "quests");
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
  if (key.startsWith("first_")) return questCondition(key.slice(6), 1);
  const [group, target] = key.split("_");
  return `${questTitle(group!)} · ${target}`;
}
