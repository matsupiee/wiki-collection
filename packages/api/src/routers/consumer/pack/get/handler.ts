import {
  card,
  genre,
  pack,
  packFeaturedCard,
  packSlotRate,
} from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { compareRarity } from "../../../../shared/card/compare-rarity";
import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { getFreePackStatus } from "../../../../shared/pack/get-free-pack-status";
import type { PackGetInput, PackGetOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: PackGetInput;
  ctx: ProtectedContext;
}): Promise<PackGetOutput> {
  const [found] = await ctx.db
    .select({
      id: pack.id,
      slug: pack.slug,
      name: pack.name,
      description: pack.description,
      type: pack.type,
      priceCoins: pack.priceCoins,
      colorHex: pack.colorHex,
      cardsPerPack: pack.cardsPerPack,
      genreName: genre.name,
    })
    .from(pack)
    .leftJoin(genre, eq(genre.id, pack.genreId))
    .where(and(eq(pack.slug, input.slug), eq(pack.isActive, true)));
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "パックが見つかりません" });

  const [rates, featuredCards, freePack, balance] = await Promise.all([
    ctx.db.select().from(packSlotRate).where(eq(packSlotRate.packId, found.id)),
    ctx.db
      .select({ id: card.id, title: card.title, rarity: card.rarity, imageUrl: card.imageUrl })
      .from(packFeaturedCard)
      .innerJoin(card, eq(card.id, packFeaturedCard.cardId))
      .where(eq(packFeaturedCard.packId, found.id))
      .orderBy(desc(packFeaturedCard.weight), asc(card.title)),
    getFreePackStatus(ctx.db, ctx.session.user.id, new Date()),
    getCoinBalance(ctx.db, ctx.session.user.id),
  ]);

  const slotRates = Array.from({ length: found.cardsPerPack }, (_, i) => {
    const slot = i + 1;
    const slotRows = rates.filter((r) => r.slot === slot && r.weight > 0);
    const total = slotRows.reduce((sum, r) => sum + r.weight, 0);
    return {
      slot,
      rates: slotRows
        .sort((a, b) => compareRarity(a.rarity, b.rarity))
        .map((r) => ({ rarity: r.rarity, percent: Math.round((r.weight / total) * 10000) / 100 })),
    };
  });

  const blockedReason =
    found.type === "free_basic"
      ? freePack.remaining > 0
        ? null
        : "no_free_pack"
      : balance.total >= (found.priceCoins ?? 0)
        ? null
        : "insufficient_coins";

  return {
    pack: found,
    slotRates,
    featuredCards,
    canOpen: blockedReason === null,
    blockedReason,
    freePack: {
      remaining: freePack.remaining,
      dailyResetsAt: freePack.dailyResetsAt.toISOString(),
    },
    balance: balance.total,
  };
}
