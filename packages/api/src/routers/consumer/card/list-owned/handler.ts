import { card, genre, userCard } from "@wiki-collection/db/schema/index";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { compareRarity } from "../../../../shared/card/compare-rarity";
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
        eq(userCard.userId, ctx.session.user.id),
        inArray(userCard.status, ["owned", "listed"]),
        input.genreId ? eq(card.genreId, input.genreId) : undefined,
        input.rarity ? eq(card.rarity, input.rarity) : undefined,
      ),
    )
    .groupBy(card.id)
    .orderBy(desc(sql`max(${userCard.createdAt})`));

  const cards = rows
    .map((r) => ({
      ...r,
      ownedCount: Number(r.ownedCount),
      listedCount: Number(r.listedCount),
    }))
    .sort((a, b) => compareRarity(b.rarity, a.rarity));

  // 出品中のカードも「残す1枚」に数える
  const duplicates = cards.reduce(
    (acc, c) => {
      const count = Math.min(c.ownedCount, c.ownedCount + c.listedCount - 1);
      return { count: acc.count + count, points: acc.points + count * getRedeemPoints(c.rarity) };
    },
    { count: 0, points: 0 },
  );
  return { cards, duplicates };
}
