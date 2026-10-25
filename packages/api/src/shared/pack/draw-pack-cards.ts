import type { Database } from "@wiki-collection/db";
import type { Rarity } from "@wiki-collection/db/enums";
import { card, packFeaturedCard, packSlotRate } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";

import { compareRarity } from "../card/compare-rarity";

export type Random = () => number;

// 0 以上 1 未満の暗号学的な乱数
export const secureRandom: Random = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]! / 2 ** 32;
};

function pickWeighted<T>(items: { item: T; weight: number }[], random: Random): T {
  const total = items.reduce((sum, { weight }) => sum + weight, 0);
  let point = random() * total;
  for (const { item, weight } of items) {
    point -= weight;
    if (point < 0) return item;
  }
  return items[items.length - 1]!.item;
}

export type DrawnCard = { cardId: string; rarity: Rarity };

// パックの中身を抽選する。枠ごとに pack_slot_rate でレアリティを決め、
// そのレアリティの候補から pack_featured_card の重み（登録なしは 1）で1枚を選ぶ。
// 戻り値は開封演出でめくる順（レアリティの低い順）に並べてある
export async function drawPackCards(
  db: Database,
  pack: { id: string; genreId: string | null; cardsPerPack: number },
  random: Random = secureRandom,
): Promise<DrawnCard[]> {
  const [rates, candidates, featured] = await Promise.all([
    db
      .select()
      .from(packSlotRate)
      .where(eq(packSlotRate.packId, pack.id))
      .orderBy(asc(packSlotRate.slot)),
    db
      .select({ id: card.id, rarity: card.rarity })
      .from(card)
      .where(
        and(eq(card.isActive, true), pack.genreId ? eq(card.genreId, pack.genreId) : undefined),
      ),
    db.select().from(packFeaturedCard).where(eq(packFeaturedCard.packId, pack.id)),
  ]);

  const featuredWeights = new Map(featured.map((f) => [f.cardId, f.weight]));
  const candidatesByRarity = new Map<Rarity, { item: DrawnCard; weight: number }[]>();
  for (const c of candidates) {
    const list = candidatesByRarity.get(c.rarity) ?? [];
    list.push({ item: { cardId: c.id, rarity: c.rarity }, weight: featuredWeights.get(c.id) ?? 1 });
    candidatesByRarity.set(c.rarity, list);
  }
  if (candidatesByRarity.size === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "このパックに入るカードがありません",
    });
  }

  const drawn: DrawnCard[] = [];
  for (let slot = 1; slot <= pack.cardsPerPack; slot++) {
    // 候補カードのないレアリティは抽選から外す。すべて外れたら、候補のあるレアリティから等確率で選ぶ
    const slotRates = rates
      .filter((r) => r.slot === slot && r.weight > 0 && candidatesByRarity.has(r.rarity))
      .map((r) => ({ item: r.rarity, weight: r.weight }));
    const rarity =
      slotRates.length > 0
        ? pickWeighted(slotRates, random)
        : pickWeighted(
            [...candidatesByRarity.keys()].map((r) => ({ item: r, weight: 1 })),
            random,
          );
    drawn.push(pickWeighted(candidatesByRarity.get(rarity)!, random));
  }

  return drawn
    .map((d, index) => ({ d, index }))
    .sort((a, b) => compareRarity(a.d.rarity, b.d.rarity) || a.index - b.index)
    .map(({ d }) => d);
}
