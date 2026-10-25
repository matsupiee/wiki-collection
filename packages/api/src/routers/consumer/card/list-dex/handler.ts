import { card, cardDiscovery, genre } from "@wiki-collection/db/schema/index";
import { and, asc, eq, isNotNull, or } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { compareRarity } from "../../../../shared/card/compare-rarity";
import type { CardListDexInput, CardListDexOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: CardListDexInput;
  ctx: ProtectedContext;
}): Promise<CardListDexOutput> {
  // 排出が止まったカードも、手に入れたことがあれば図鑑に残す
  const [genres, rows] = await Promise.all([
    ctx.db.select().from(genre).orderBy(asc(genre.sortOrder)),
    ctx.db
      .select({
        id: card.id,
        title: card.title,
        imageUrl: card.imageUrl,
        rarity: card.rarity,
        genreId: card.genreId,
        discoveredId: cardDiscovery.id,
      })
      .from(card)
      .leftJoin(
        cardDiscovery,
        and(eq(cardDiscovery.cardId, card.id), eq(cardDiscovery.userId, ctx.session.user.id)),
      )
      .where(or(eq(card.isActive, true), isNotNull(cardDiscovery.id)))
      .orderBy(asc(card.title)),
  ]);

  return {
    genres: genres.map((g) => {
      const inGenre = rows.filter((r) => r.genreId === g.id);
      return {
        id: g.id,
        name: g.name,
        colorHex: g.colorHex,
        total: inGenre.length,
        discovered: inGenre.filter((r) => r.discoveredId !== null).length,
      };
    }),
    cards: rows
      .filter((r) => !input.genreId || r.genreId === input.genreId)
      .sort((a, b) => compareRarity(a.rarity, b.rarity))
      .map((r) => {
        const discovered = r.discoveredId !== null;
        return {
          id: r.id,
          title: discovered ? r.title : null,
          imageUrl: discovered ? r.imageUrl : null,
          rarity: r.rarity,
          genreId: r.genreId,
          discovered,
        };
      }),
  };
}
