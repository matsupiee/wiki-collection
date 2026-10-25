import { auctionBid, card, marketListing } from "@wiki-collection/db/schema/index";
import { and, desc, eq, inArray, max, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { settleEndedAuctions } from "../../../../shared/market/settle-ended-auctions";
import type { MarketListMineOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<MarketListMineOutput> {
  const userId = ctx.session.user.id;
  await settleEndedAuctions(ctx.db, new Date());

  const columns = {
    id: marketListing.id,
    format: marketListing.format,
    status: marketListing.status,
    price: sql<number>`coalesce(${marketListing.soldPrice}, ${marketListing.price}, ${marketListing.currentPrice}, ${marketListing.startPrice})`,
    bidCount: marketListing.bidCount,
    endsAt: marketListing.endsAt,
    card: { id: card.id, title: card.title, rarity: card.rarity },
  };
  const toSummary = <T extends { price: number; endsAt: Date | null }>(r: T) => ({
    ...r,
    price: Number(r.price),
    endsAt: r.endsAt?.toISOString() ?? null,
  });

  const [selling, bought, myBids] = await Promise.all([
    ctx.db
      .select(columns)
      .from(marketListing)
      .innerJoin(card, eq(card.id, marketListing.cardId))
      .where(eq(marketListing.sellerId, userId))
      .orderBy(desc(marketListing.createdAt))
      .limit(50),
    ctx.db
      .select(columns)
      .from(marketListing)
      .innerJoin(card, eq(card.id, marketListing.cardId))
      .where(eq(marketListing.buyerId, userId))
      .orderBy(desc(marketListing.soldAt))
      .limit(50),
    ctx.db
      .select({
        listingId: auctionBid.listingId,
        myBid: max(auctionBid.amount),
        isLeading: sql<number>`max(case when ${auctionBid.status} = 'leading' then 1 else 0 end)`,
      })
      .from(auctionBid)
      .where(eq(auctionBid.bidderId, userId))
      .groupBy(auctionBid.listingId)
      .orderBy(desc(max(auctionBid.createdAt)))
      .limit(50),
  ]);

  const biddingListings =
    myBids.length === 0
      ? []
      : await ctx.db
          .select(columns)
          .from(marketListing)
          .innerJoin(card, eq(card.id, marketListing.cardId))
          .where(
            and(
              inArray(
                marketListing.id,
                myBids.map((b) => b.listingId),
              ),
              eq(marketListing.status, "active"),
            ),
          )
          .orderBy(marketListing.endsAt);

  return {
    selling: selling.map(toSummary),
    bought: bought.map(toSummary),
    bidding: biddingListings.map((l) => {
      const bid = myBids.find((b) => b.listingId === l.id)!;
      return { ...toSummary(l), myBid: bid.myBid ?? 0, isLeading: Number(bid.isLeading) === 1 };
    }),
  };
}
