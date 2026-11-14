import {
  card,
  userCardOwnershipTransfers,
  genre,
  marketListing,
  userCard,
} from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { CardGetInput, CardGetOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: CardGetInput;
  ctx: ProtectedContext;
}): Promise<CardGetOutput> {
  const userId = ctx.session.user.id;
  const [found] = await ctx.db
    .select({ card, genreName: genre.name, genreColorHex: genre.colorHex })
    .from(card)
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(eq(card.id, input.cardId));
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "カードが見つかりません" });

  const [copies, [discovery], [lowest]] = await Promise.all([
    ctx.db
      .select({
        id: userCard.id,
        status: userCard.status,
      })
      .from(userCard)
      .where(and(eq(userCard.ownerId, userId), eq(userCard.cardId, found.card.id)))
      .orderBy(asc(userCard.createdAt)),
    ctx.db
      .select({ id: userCardOwnershipTransfers.id })
      .from(userCardOwnershipTransfers)
      .where(
        and(
          eq(userCardOwnershipTransfers.toUserId, userId),
          eq(userCardOwnershipTransfers.cardId, found.card.id),
        ),
      )
      .limit(1),
    ctx.db
      .select({
        price: sql<
          number | null
        >`min(coalesce(${marketListing.currentPrice}, ${marketListing.startPrice}))`,
      })
      .from(marketListing)
      .where(
        and(
          eq(marketListing.cardId, found.card.id),
          eq(marketListing.status, "active"),
          eq(marketListing.format, "auction"),
          gt(marketListing.endsAt, new Date()),
        ),
      ),
  ]);

  // 手に入れたことのないカードの中身は見せない
  if (!discovery)
    throw new TRPCError({ code: "NOT_FOUND", message: "まだ手に入れていないカードです" });

  const { card: c } = found;
  return {
    card: {
      id: c.id,
      title: c.title,
      summary: c.summary,
      imageUrl: c.imageUrl,
      imageCredit: c.imageCredit,
      rarity: c.rarity,
      monthlyPageviews: c.monthlyPageviews,
      articleLength: c.articleLength,
      // 改名されても Wikipedia 側のリダイレクトで記事にたどり着ける
      wikiUrl: `https://${c.wikiLang}.wikipedia.org/wiki/${encodeURIComponent(c.title)}`,
      // CC BY-SA の帰属表示として、要約を取った時点の版を示す
      wikiRevisionUrl: c.wikiRevisionId
        ? `https://${c.wikiLang}.wikipedia.org/w/index.php?oldid=${c.wikiRevisionId}`
        : null,
      genreName: found.genreName,
      genreColorHex: found.genreColorHex,
    },
    discovered: true,
    ownedUserCardIds: copies.filter((u) => u.status === "owned").map((u) => u.id),
    listedCount: copies.filter((u) => u.status === "listed").length,
    lowestMarketPrice: lowest?.price ?? null,
  };
}
