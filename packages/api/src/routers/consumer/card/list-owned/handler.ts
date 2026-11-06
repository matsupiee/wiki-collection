import { elementOf } from "@wiki-collection/db/battle";
import { card, genre, userCard } from "@wiki-collection/db/schema/index";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { notInTeam } from "../../../../shared/card/not-in-team";
import type { ProtectedContext } from "../../../../context";
import { getRedeemPoints } from "../../../../shared/card/get-redeem-points";
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
      genreSlug: genre.slug,
      monthlyPageviews: card.monthlyPageviews,
      articleLength: card.articleLength,
      title: card.title,
      imageUrl: card.imageUrl,
      rarity: card.rarity,
      genreName: genre.name,
      genreColorHex: genre.colorHex,
      protectedCount: sql<number>`sum(case when ${userCard.status} = 'owned' and not (${notInTeam()}) then 1 else 0 end)`,
      ownedCount: sql<number>`sum(case when ${userCard.status} = 'owned' then 1 else 0 end)`,
      listedCount: sql<number>`sum(case when ${userCard.status} = 'listed' then 1 else 0 end)`,
    })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(
      and(
        eq(userCard.userId, ctx.session.user.id),
        inArray(userCard.status, ["owned", "listed"]),
        input.genreId ? eq(card.genreId, input.genreId) : undefined,
        input.rarity ? eq(card.rarity, input.rarity) : undefined,
      ),
    )
    .groupBy(card.id)
    .orderBy(
      ...(input.sort === "attack"
        ? [desc(card.monthlyPageviews)]
        : input.sort === "defense"
          ? [desc(card.articleLength)]
          : []),
      desc(sql`max(${userCard.createdAt})`),
      asc(card.id),
    );

  const cards = rows.map((r) => ({
    ...r,
    element: elementOf(r.genreSlug),
    protectedCount: Number(r.protectedCount),
    ownedCount: Number(r.ownedCount),
    listedCount: Number(r.listedCount),
  }));

  // 出品中のカードも「残す1枚」に数える
  const duplicates = cards.reduce(
    (acc, c) => {
      const count = Math.max(
        0,
        Math.min(c.ownedCount - Number(c.protectedCount), c.ownedCount + c.listedCount - 1),
      );
      return { count: acc.count + count, points: acc.points + count * getRedeemPoints(c.rarity) };
    },
    { count: 0, points: 0 },
  );
  return { cards, duplicates };
}
