import { card, genre, userCard } from "@wiki-collection/db/schema/index";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { CardListOwnedInput, CardListOwnedOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: CardListOwnedInput;
  ctx: ProtectedContext;
}): Promise<CardListOwnedOutput> {
  const rows = await ctx.db
    .select({
      id: card.id,
      monthlyPageviews: card.monthlyPageviews,
      articleLength: card.articleLength,
      title: card.title,
      imageUrl: card.imageUrl,
      rarity: card.rarity,
      genreName: genre.name,
      genreColorHex: genre.colorHex,
      ownedCount: sql<number>`sum(case when ${userCard.status} = 'owned' then 1 else 0 end)`,
      listedCount: sql<number>`sum(case when ${userCard.status} = 'listed' then 1 else 0 end)`,
    })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(
      and(
        eq(userCard.ownerId, ctx.session.user.id),
        inArray(userCard.status, ["owned", "listed"]),
        input.genreId ? eq(card.genreId, input.genreId) : undefined,
        input.rarity ? eq(card.rarity, input.rarity) : undefined,
      ),
    )
    .groupBy(card.id)
    .orderBy(
      ...(input.sort === "monthlyPageviews"
        ? [desc(card.monthlyPageviews)]
        : input.sort === "articleLength"
          ? [desc(card.articleLength)]
          : []),
      desc(sql`max(${userCard.createdAt})`),
      asc(card.id),
    );

  const cards = rows.map((r) => ({
    ...r,
    ownedCount: Number(r.ownedCount),
    listedCount: Number(r.listedCount),
  }));

  return { cards };
}
