import { card, pack, packOpening, packOpeningCard } from "@wiki-collection/db/schema/index";
import { asc, desc, eq, inArray } from "drizzle-orm";

import { compareRarity } from "../../../../shared/card/compare-rarity";
import type { ProtectedContext } from "../../../../context";
import type { OpeningListOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<OpeningListOutput> {
  const openings = await ctx.db
    .select({
      id: packOpening.id,
      createdAt: packOpening.createdAt,
      revealedAt: packOpening.revealedAt,
      payment: packOpening.payment,
      coinsSpent: packOpening.coinsSpent,
      packName: pack.name,
      packSlug: pack.slug,
    })
    .from(packOpening)
    .innerJoin(pack, eq(pack.id, packOpening.packId))
    .where(eq(packOpening.userId, ctx.session.user.id))
    .orderBy(desc(packOpening.createdAt))
    .limit(30);
  if (openings.length === 0) return { openings: [] };

  const cards = await ctx.db
    .select({
      openingId: packOpeningCard.packOpeningId,
      cardId: card.id,
      title: card.title,
      rarity: card.rarity,
    })
    .from(packOpeningCard)
    .innerJoin(card, eq(card.id, packOpeningCard.cardId))
    .where(
      inArray(
        packOpeningCard.packOpeningId,
        openings.map((o) => o.id),
      ),
    )
    .orderBy(asc(packOpeningCard.userCardId));

  return {
    openings: openings.map((o) => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      revealed: o.revealedAt !== null,
      payment: o.payment,
      coinsSpent: o.coinsSpent,
      packName: o.packName,
      packSlug: o.packSlug,
      cards: cards
        .filter((c) => c.openingId === o.id)
        .sort((a, b) => compareRarity(a.rarity, b.rarity))
        .map((c) => ({ cardId: c.cardId, title: c.title, rarity: c.rarity })),
    })),
  };
}
