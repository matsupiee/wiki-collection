import type { Rarity } from "./enums";

export type RarityThresholds = Record<Exclude<Rarity, "common">, number>;

// 高いレアリティから順に並べる。判定はこの順で下限を見る
const limits: [Exclude<Rarity, "common">, number][] = [
  ["legendary", 0.01],
  ["double_rare", 0.05],
  ["rare", 0.2],
  ["uncommon", 0.5],
];

// 月間閲覧数の順位でレアリティを決める。上位 1% がレジェンド、5% までがダブルレア、20% までがレア、50% までがアンコモン。
// カードが少ないときでも各レアリティに最低1枚は入るよう、枚数は1以上に切り上げる
export function rarityByRank(rankFromTop: number, total: number): Rarity {
  let count = 0;
  for (const [rarity, ratio] of limits) {
    count = Math.max(count + 1, Math.round(total * ratio));
    if (rankFromTop < count) return rarity;
  }
  return "common";
}

// 閲覧数の一覧を順位でレアリティに振り分け、各レアリティに入った閲覧数の最小値を下限にする。
// 全レアリティに1枚ずつ入るよう、5件以上が必要
export function thresholdsFromPageviews(pageviews: number[]): RarityThresholds {
  if (pageviews.length < 5) {
    throw new Error("レアリティの下限を決めるには、閲覧数が5件以上必要です");
  }
  const sorted = [...pageviews].sort((a, b) => b - a);
  const thresholds = {} as RarityThresholds;
  for (const [rank, views] of sorted.entries()) {
    const rarity = rarityByRank(rank, sorted.length);
    if (rarity !== "common") thresholds[rarity] = views;
  }
  return thresholds;
}

export function rarityByThresholds(monthlyPageviews: number, thresholds: RarityThresholds): Rarity {
  for (const [rarity] of limits) {
    if (monthlyPageviews >= thresholds[rarity]) return rarity;
  }
  return "common";
}
