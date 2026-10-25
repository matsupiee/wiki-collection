import { card, genre, marketListing, user } from "@wiki-collection/db/schema/index";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { settleEndedAuctions } from "../../../../shared/market/settle-ended-auctions";
import type { MarketListInput, MarketListOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketListInput;
  ctx: ProtectedContext;
}): Promise<MarketListOutput> {
  await settleEndedAuctions(ctx.db, new Date());

  const displayPrice = sql<number>`coalesce(${marketListing.price}, ${marketListing.currentPrice}, ${marketListing.startPrice})`;
  const orderBy = {
    newest: [desc(marketListing.createdAt)],
    price_asc: [asc(displayPrice), desc(marketListing.createdAt)],
    ending_soon: [asc(marketListing.endsAt)],
    most_bids: [desc(marketListing.bidCount), asc(marketListing.endsAt)],
  }[input.sort ?? "newest"];

  const rows = await ctx.db
    .select({
      id: marketListing.id,
      format: marketListing.format,
      price: displayPrice,
      bidCount: marketListing.bidCount,
      endsAt: marketListing.endsAt,
      sellerId: marketListing.sellerId,
      sellerName: user.name,
      card: {
        id: card.id,
        title: card.title,
        imageUrl: card.imageUrl,
        rarity: card.rarity,
        genreName: genre.name,
        genreColorHex: genre.colorHex,
      },
    })
    .from(marketListing)
    .innerJoin(card, eq(card.id, marketListing.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .innerJoin(user, eq(user.id, marketListing.sellerId))
    .where(
      and(
        eq(marketListing.status, "active"),
        eq(marketListing.format, input.format),
        input.cardId ? eq(marketListing.cardId, input.cardId) : undefined,
        input.rarity ? eq(card.rarity, input.rarity) : undefined,
        input.query ? like(card.title, `%${input.query.replace(/[%_]/g, "")}%`) : undefined,
      ),
    )
    .orderBy(...orderBy)
    .limit(50);

  return {
    listings: rows.map(({ sellerId, ...r }) => ({
      ...r,
      price: Number(r.price),
      endsAt: r.endsAt?.toISOString() ?? null,
      isMine: sellerId === ctx.session.user.id,
    })),
  };
}
