import type { Database } from "@wiki-collection/db";
import type { Rarity } from "@wiki-collection/db/enums";
import { card, packSlotRate } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq } from "drizzle-orm";

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
// そのレアリティの候補から等確率で1枚を選ぶ。
// 戻り値は開封演出でめくる順（レアリティの低い順）に並べてある
export async function drawPackCards(
  db: Database,
  pack: {
    type: "free_basic" | "premium";
    id: string;
    genreId: string | null;
    cardsPerPack: number;
  },
  random: Random = secureRandom,
): Promise<DrawnCard[]> {
  const eligible = and(
    eq(card.isActive, true),
    pack.genreId ? eq(card.genreId, pack.genreId) : undefined,
  );
  const [rates, counts] = await Promise.all([
    db
      .select()
      .from(packSlotRate)
      .where(eq(packSlotRate.packId, pack.id))
      .orderBy(asc(packSlotRate.slot)),
    db
      .select({ rarity: card.rarity, size: count() })
      .from(card)
      .where(eligible)
      .groupBy(card.rarity),
  ]);
  const candidatesByRarity = new Map(counts.map((c) => [c.rarity, c.size]));
  if (!candidatesByRarity.size) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "このパックに入るカードがありません",
    });
  }

  const drawn: DrawnCard[] = [];
  for (let slot = 1; slot <= pack.cardsPerPack; slot++) {
    // 候補カードのないレアリティは抽選から外す。無料パックですべて外れたら、候補のあるレアリティから等確率で選ぶ
    const slotRates = rates
      .filter((r) => r.slot === slot && r.weight > 0 && candidatesByRarity.has(r.rarity))
      .map((r) => ({ item: r.rarity, weight: r.weight }))
      .sort((a, b) => compareRarity(a.item, b.item));
    if (slotRates.length === 0 && pack.type === "premium") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "このパックの排出条件を満たすカードがありません",
      });
    }
    const rarity =
      slotRates.length > 0
        ? pickWeighted(slotRates, random)
        : pickWeighted(
            [...candidatesByRarity.keys()].map((r) => ({ item: r, weight: 1 })),
            random,
          );
    const offset = Math.floor(random() * candidatesByRarity.get(rarity)!);
    const [chosen] = await db
      .select({ cardId: card.id, rarity: card.rarity })
      .from(card)
      .where(and(eligible, eq(card.rarity, rarity)))
      .limit(1)
      .offset(offset);
    if (!chosen) throw new TRPCError({ code: "CONFLICT", message: "排出対象が更新されました" });
    drawn.push(chosen);
  }

  return drawn
    .map((d, index) => ({ d, index }))
    .sort((a, b) => compareRarity(a.d.rarity, b.d.rarity) || a.index - b.index)
    .map(({ d }) => d);
}
