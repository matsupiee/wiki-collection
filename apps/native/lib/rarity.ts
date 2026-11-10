import { rarities, type Rarity } from "@wiki-collection/db/enums";

export const rarityLabels = {
  common: "C",
  rare: "R",
  super_rare: "SR",
  legendary: "レジェンド",
} satisfies Record<Rarity, string>;

export function highestOpeningRarity(cards: readonly { card: { rarity: Rarity } }[]): Rarity {
  return cards.reduce<Rarity>(
    (highest, { card }) =>
      rarities.indexOf(card.rarity) > rarities.indexOf(highest) ? card.rarity : highest,
    "common",
  );
}
