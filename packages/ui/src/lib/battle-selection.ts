export function toggleTeamMember(members: string[], id: string): string[] {
  if (members.includes(id)) return members.filter((member) => member !== id);
  return members.length < 3 ? [...members, id] : members;
}
export function moveTeamMember(members: string[], index: number, delta: number): string[] {
  const next = index + delta;
  if (next < 0 || next >= members.length) return members;
  const result = [...members];
  [result[index], result[next]] = [result[next]!, result[index]!];
  return result;
}
export type FusionCard = {
  id: string;
  cardId: string;
  attackBonus: number;
  defenseBonus: number;
  inTeam: boolean;
  defense: number | null;
};
export function groupFusionMaterials<T extends FusionCard>(cards: T[], baseId: string) {
  const groups = new Map<
    string,
    { key: string; card: T; ownedCount: number; available: T[]; strengthened: boolean }
  >();
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
