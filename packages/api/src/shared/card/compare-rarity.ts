import { type Rarity, rarities } from "@wiki-collection/db/enums";

// レアリティの低い順に並べるための比較関数
export function compareRarity(a: Rarity, b: Rarity): number {
  return rarities.indexOf(a) - rarities.indexOf(b);
}
