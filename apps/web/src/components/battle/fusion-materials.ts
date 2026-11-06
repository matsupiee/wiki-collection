import type { BattleCard } from "./card-picker";
export type MaterialGroup = {
  key: string;
  card: BattleCard;
  ownedCount: number;
  available: BattleCard[];
  strengthened: boolean;
};
// 未強化の同種カードだけをまとめ、強化済みは1枚ずつ明示的に選ぶ。
export function groupFusionMaterials(cards: BattleCard[], baseId: string): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>();
  for (const card of cards) {
    const strengthened = card.attackBonus > 0 || card.defenseBonus > 0;
    const key = strengthened ? card.id : card.cardId;
    let group = groups.get(key);
    if (!group) {
      group = { key, card, ownedCount: 0, available: [], strengthened };
      groups.set(key, group);
    }
    group.ownedCount++;
    if (card.id !== baseId && !card.inTeam && card.defense !== null) group.available.push(card);
  }
  return [...groups.values()].filter((g) => g.available.length > 0);
}
