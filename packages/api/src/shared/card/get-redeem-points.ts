import type { Rarity } from "@wiki-collection/db/enums";

const redeemPointsByRarity: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 15,
  double_rare: 60,
  legendary: 300,
};

// カードを還元したときに受け取る pt。パック価格の決め方に関わるため、ここ以外で値を持たない
export function getRedeemPoints(rarity: Rarity): number {
  return redeemPointsByRarity[rarity];
}
