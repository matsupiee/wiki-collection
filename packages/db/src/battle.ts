// ゲーム用の大分類。元のWikidataジャンル自体は変更しない。
export const elements = ["person", "nature", "society", "culture", "general"] as const;
export type Element = (typeof elements)[number];
// 保存済み対戦の能力値と勝敗は変えず、旧ルールとして表示する。
export const historicalElements = [...elements, "technology", "fire", "water", "grass"] as const;
export type HistoricalElement = (typeof historicalElements)[number];
export const elementLabels: Record<HistoricalElement, string> = {
  person: "人物",
  nature: "自然",
  technology: "科学技術",
  society: "社会",
  culture: "文化",
  general: "総合",
  fire: "旧属性・炎",
  water: "旧属性・水",
  grass: "旧属性・草",
};
export type BattleRuleVersion = 1 | 2;
export const currentBattleRuleVersion = 2 as const;
export const legacyWeakness: Record<HistoricalElement, HistoricalElement | null> = {
  person: "nature",
  nature: "technology",
  technology: "society",
  society: "culture",
  culture: "person",
  general: null,
  fire: "water",
  water: "grass",
  grass: "fire",
};
export const legacyAffinityRules = [
  { from: "person", to: "culture", reason: "人物が文化を生み出す" },
  { from: "culture", to: "society", reason: "文化が社会を動かす" },
  { from: "society", to: "technology", reason: "社会が科学技術を支える" },
  { from: "technology", to: "nature", reason: "科学技術が自然に働きかける" },
  { from: "nature", to: "person", reason: "自然が人物の暮らしに影響する" },
] as const;
export const weakness: Record<HistoricalElement, HistoricalElement | null> = {
  ...legacyWeakness,
  nature: "society",
};
export const affinityRules = [
  { from: "person", to: "culture", reason: "人物が文化を生み出す" },
  { from: "culture", to: "society", reason: "文化が社会を動かす" },
  { from: "society", to: "nature", reason: "社会が自然に働きかける" },
  { from: "nature", to: "person", reason: "自然が人物の暮らしに影響する" },
] as const;
const genreGroups: Record<Exclude<Element, "general">, readonly string[]> = {
  person: ["Q5", "sample-human"],
  nature: [
    "Q523", // 恒星
    "Q634", // 惑星
    "Q608",
    "Q726",
    "Q7944",
    "Q16521",
    "Q33837",
    "Q782623",
    "Q2996394",
    "Q103812529",
    "Q112193867",
    "Q112826905",
    "sample-astronomical-object",
    "sample-planet",
    "sample-chemical-compound",
    "sample-biological-process",
    "sample-physical-phenomenon",
    "sample-mountain",
    "sample-lake",
    "sample-island",
    "sample-sea",
    "sample-river",
  ],
  society: [
    "Q3918",
    "Q6256",
    "Q18127",
    "Q43229",
    "Q50337",
    "Q62049",
    "Q103495",
    "Q178561",
    "Q197952",
    "Q235690",
    "Q891723",
    "Q1656682",
    "Q3024240",
    "Q4164871",
    "Q4830453",
    "Q11666832",
    "Q23983335",
    "Q30941437",
    "sample-battle",
    "sample-event",
    "sample-period",
    "sample-shogunate",
    "sample-prefecture",
    "sample-city",
  ],
  culture: [
    "Q35127",
    "Q92438",
    "Q899523",
    "Q1049494",
    "Q3220391",
    "Q4382945",
    "Q10876391",
    "Q11074464",
    "Q29654788",
    "sample-spacecraft",
    "sample-theory",
    "sample-academic-discipline",
    "sample-medication",
    "sample-table",
    "Q7889",
    "Q8394",
    "Q11424",
    "Q15416",
    "Q24856",
    "Q33506",
    "Q43747",
    "Q53815",
    "Q134556",
    "Q196600",
    "Q202866",
    "Q215380",
    "Q216337",
    "Q500834",
    "Q501390",
    "Q526877",
    "Q641066",
    "Q742421",
    "Q746549",
    "Q868291",
    "Q936821",
    "Q1079023",
    "Q1141470",
    "Q1200935",
    "Q1238731",
    "Q1263926",
    "Q1478437",
    "Q1667921",
    "Q2155186",
    "Q5219928",
    "Q5398426",
    "Q7058673",
    "Q7725634",
    "Q9212979",
    "Q10648343",
    "Q11303455",
    "Q11446438",
    "Q11483816",
    "Q11578153",
    "Q12613663",
    "Q13027888",
    "Q14514600",
    "Q15229207",
    "Q15632617",
    "Q15961987",
    "Q16145172",
    "Q18011172",
    "Q18510489",
    "Q18608583",
    "Q21198342",
    "Q47461344",
    "Q56829666",
    "Q63952888",
    "Q104213567",
    "Q105416259",
    "Q105543609",
    "Q107655869",
    "Q114609228",
    "Q123146758",
    "Q125130106",
    "sample-sport",
    "sample-dish",
    "sample-art-form",
    "sample-board-game",
  ],
};
const elementByGenre = new Map<string, Element>(
  Object.entries(genreGroups).flatMap(([element, ids]) =>
    ids.map((id) => [id, element as Element] as const),
  ),
);
export function elementOf(genreSlug: string): Element {
  return elementByGenre.get(genreSlug) ?? "general";
}
export type Fighter = {
  id: string;
  title: string;
  attack: number;
  defense: number;
  element: HistoricalElement;
};
export type TeamSnapshot = {
  // 版を保存していない旧スナップショットは5属性ルール（1）として表示する。
  ruleVersion?: BattleRuleVersion;
  id: string;
  userId: string;
  player: string;
  name: string;
  members: Fighter[];
};
export type RankEntry = TeamSnapshot & {
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
};
export type DailyRanking = RankEntry[];
// 同じ位置のカード同士が同時に攻撃。防御を引いたダメージを比較し、3本の勝敗で決める。
export function duelDetails(
  a: Fighter,
  b: Fighter,
  ruleVersion: BattleRuleVersion = currentBattleRuleVersion,
) {
  const attack = (x: Fighter, y: Fighter) => {
    const multiplier =
      x.element === (ruleVersion === 1 ? legacyWeakness : weakness)[y.element] ? 2 : 1;
    return { multiplier, damage: Math.max(0, x.attack * multiplier - y.defense) };
  };
  const left = attack(a, b),
    right = attack(b, a);
  return { left, right, result: Math.sign(left.damage - right.damage) };
}
export function duel(
  a: Fighter,
  b: Fighter,
  ruleVersion: BattleRuleVersion = currentBattleRuleVersion,
): number {
  return duelDetails(a, b, ruleVersion).result;
}
export function fight(
  a: Fighter[],
  b: Fighter[],
  ruleVersion: BattleRuleVersion = currentBattleRuleVersion,
): number {
  return Math.sign(a.reduce((score, member, i) => score + duel(member, b[i]!, ruleVersion), 0));
}
export function fusionGains(attack: number, defense: number, coefficient: number) {
  if (coefficient < 0.2 || coefficient > 1 || !Number.isFinite(coefficient))
    throw new Error("Invalid coefficient");
  return { attackGain: attack * 0.01 * coefficient, defenseGain: defense * 0.01 * coefficient };
}

// D1のバインド変数上限内で一括処理する。
export const MAX_FUSION_MATERIALS = 50;
