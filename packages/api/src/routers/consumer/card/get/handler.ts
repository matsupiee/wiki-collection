import {
  card,
  cardDiscovery,
  genre,
  marketListing,
  userCard,
} from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, min } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getRedeemPoints } from "../../../../shared/card/get-redeem-points";
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
      .select({ id: userCard.id, status: userCard.status })
      .from(userCard)
      .where(and(eq(userCard.userId, userId), eq(userCard.cardId, found.card.id)))
      .orderBy(asc(userCard.createdAt)),
    ctx.db
      .select({ id: cardDiscovery.id })
      .from(cardDiscovery)
      .where(and(eq(cardDiscovery.userId, userId), eq(cardDiscovery.cardId, found.card.id))),
    ctx.db
      .select({ price: min(marketListing.price) })
      .from(marketListing)
      .where(
        and(
          eq(marketListing.cardId, found.card.id),
          eq(marketListing.status, "active"),
          eq(marketListing.format, "fixed_price"),
        ),
      ),
  ]);

  // 図鑑で見つけていないカードの中身は見せない
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
    redeemPoints: getRedeemPoints(c.rarity),
    lowestMarketPrice: lowest?.price ?? null,
  };
}
