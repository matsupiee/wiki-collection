import { auctionBid, card, genre, marketListing, user } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { getMinNextBid } from "../../../../shared/market/get-min-next-bid";
import { settleEndedAuctions } from "../../../../shared/market/settle-ended-auctions";
import type { MarketGetInput, MarketGetOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketGetInput;
  ctx: ProtectedContext;
}): Promise<MarketGetOutput> {
  const userId = ctx.session.user.id;
  await settleEndedAuctions(ctx.db, new Date(), { listingId: input.listingId });

  const [found] = await ctx.db
    .select({
      listing: marketListing,
      sellerName: user.name,
      card: {
        id: card.id,
        title: card.title,
        summary: card.summary,
        imageUrl: card.imageUrl,
        rarity: card.rarity,
        monthlyPageviews: card.monthlyPageviews,
        genreName: genre.name,
        genreColorHex: genre.colorHex,
      },
    })
    .from(marketListing)
    .innerJoin(card, eq(card.id, marketListing.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .innerJoin(user, eq(user.id, marketListing.sellerId))
    .where(eq(marketListing.id, input.listingId));
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "出品が見つかりません" });

  const [bids, balance] = await Promise.all([
    ctx.db
      .select({
        id: auctionBid.id,
        amount: auctionBid.amount,
        bidderId: auctionBid.bidderId,
        bidderName: user.name,
        status: auctionBid.status,
        createdAt: auctionBid.createdAt,
      })
      .from(auctionBid)
      .innerJoin(user, eq(user.id, auctionBid.bidderId))
      .where(eq(auctionBid.listingId, found.listing.id))
      .orderBy(desc(auctionBid.sequence))
      .limit(20),
    getCoinBalance(ctx.db, userId),
  ]);

  const { listing } = found;
  const isAuctionOpen = listing.format === "auction" && listing.status === "active";
  return {
    listing: {
      id: listing.id,
      format: listing.format,
      status: listing.status,
      price: listing.price,
      startPrice: listing.startPrice,
      currentPrice: listing.currentPrice,
      bidCount: listing.bidCount,
      endsAt: listing.endsAt?.toISOString() ?? null,
      soldPrice: listing.soldPrice,
      sellerName: found.sellerName,
      isMine: listing.sellerId === userId,
      isBuyer: listing.buyerId === userId,
    },
    card: found.card,
    bids: bids.map((b) => ({
      id: b.id,
      amount: b.amount,
      bidderName: b.bidderName,
      isMine: b.bidderId === userId,
      createdAt: b.createdAt.toISOString(),
    })),
    minNextBid: isAuctionOpen ? getMinNextBid(listing) : null,
    isLeading: bids.some((b) => b.status === "leading" && b.bidderId === userId),
    balance: balance.total,
  };
}
