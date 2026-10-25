import { auctionBid, marketListing } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { prepareBidRefund } from "../../../../shared/coin/prepare-bid-refund";
import { prepareCoinWithdraw } from "../../../../shared/coin/prepare-coin-withdraw";
import { runBatch } from "../../../../shared/coin/run-batch";
import { getMinNextBid } from "../../../../shared/market/get-min-next-bid";
import type { MarketBidInput, MarketBidOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketBidInput;
  ctx: ProtectedContext;
}): Promise<MarketBidOutput> {
  const bidderId = ctx.session.user.id;
  const [listing] = await ctx.db
    .select()
    .from(marketListing)
    .where(
      and(
        eq(marketListing.id, input.listingId),
        eq(marketListing.format, "auction"),
        eq(marketListing.status, "active"),
      ),
    );
  if (!listing || !listing.endsAt || listing.endsAt <= new Date()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "このオークションには入札できません",
    });
  }
  if (listing.sellerId === bidderId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "自分の出品には入札できません" });
  }
  const minNextBid = getMinNextBid(listing);
  if (input.amount < minNextBid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${minNextBid}pt 以上で入札してください` });
  }

  const [leading] = await ctx.db
    .select()
    .from(auctionBid)
    .where(and(eq(auctionBid.listingId, listing.id), eq(auctionBid.status, "leading")));
  if (leading?.bidderId === bidderId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "すでに最高額で入札しています" });
  }

  // 同時に入札されたときは (listing_id, sequence) の unique 制約で後の batch が失敗する
  const sequence = listing.bidCount + 1;
  const bidId = sql`(select ${auctionBid.id} from ${auctionBid} where ${and(
    eq(auctionBid.listingId, listing.id),
    eq(auctionBid.sequence, sequence),
  )})`;
  await runBatch(ctx.db, [
    ...(leading
      ? [
          ctx.db.update(auctionBid).set({ status: "outbid" }).where(eq(auctionBid.id, leading.id)),
          ...(await prepareBidRefund(ctx.db, leading)),
        ]
      : []),
    ctx.db.insert(auctionBid).values({
      listingId: listing.id,
      bidderId,
      sequence,
      amount: input.amount,
      status: "leading",
    }),
    ...(await prepareCoinWithdraw(ctx.db, {
      userId: bidderId,
      amount: input.amount,
      purpose: "auction_bid",
      marketListingId: listing.id,
      auctionBidId: bidId,
    })),
    ctx.db
      .update(marketListing)
      .set({ currentPrice: input.amount, bidCount: sequence })
      .where(eq(marketListing.id, listing.id)),
  ]);
  return { currentPrice: input.amount };
}
