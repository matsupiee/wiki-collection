import { t } from "@/lib/i18n";
import { rarities, type Rarity } from "@wiki-collection/db/enums";

export const rarityLabels = {
  common: "C",
  uncommon: "UC",
  rare: "R",
  super_rare: "SR",
  get legendary() { return t("legendary"); },
} satisfies Record<Rarity, string>;

export function highestOpeningRarity(cards: readonly { card: { rarity: Rarity } }[]): Rarity {
  return cards.reduce<Rarity>(
    (highest, { card }) =>
      rarities.indexOf(card.rarity) > rarities.indexOf(highest) ? card.rarity : highest,
    "common",
  );
}
