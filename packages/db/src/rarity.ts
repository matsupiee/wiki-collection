import type { Rarity } from "./enums";

export type RarityThresholds = Record<Exclude<Rarity, "common">, number>;

export const rarityThresholds = {
  legendary: 100_000,
  super_rare: 50_000,
  rare: 10_000,
} satisfies RarityThresholds;

export function rarityFromPageviews(monthlyPageviews: number): Rarity {
  if (monthlyPageviews >= rarityThresholds.legendary) return "legendary";
  if (monthlyPageviews >= rarityThresholds.super_rare) return "super_rare";
  if (monthlyPageviews >= rarityThresholds.rare) return "rare";
  return "common";
}
