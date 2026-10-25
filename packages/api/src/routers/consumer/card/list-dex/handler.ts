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

  // ジャンルは Wikidata の分類なので数百以上になる。ジャンルごとに全カードを走査しないよう、1回で数える
  const counts = new Map<string, { total: number; discovered: number }>();
  for (const r of rows) {
    const count = counts.get(r.genreId) ?? { total: 0, discovered: 0 };
    count.total++;
    if (r.discoveredId !== null) count.discovered++;
    counts.set(r.genreId, count);
  }

  return {
    genres: genres.map((g) => ({
      id: g.id,
      name: g.name,
      colorHex: g.colorHex,
      total: counts.get(g.id)?.total ?? 0,
      discovered: counts.get(g.id)?.discovered ?? 0,
    })),
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
