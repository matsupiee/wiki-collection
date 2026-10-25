import {
  cardDiscovery,
  coinDeposit,
  marketListing,
  userCard,
} from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { prepareCoinWithdraw } from "../../../../shared/coin/prepare-coin-withdraw";
import { runBatch } from "../../../../shared/coin/run-batch";
import { calculateMarketFee } from "../../../../shared/market/calculate-market-fee";
import type { MarketBuyInput, MarketBuyOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketBuyInput;
  ctx: ProtectedContext;
}): Promise<MarketBuyOutput> {
  const buyerId = ctx.session.user.id;
  const [listing] = await ctx.db
    .select()
    .from(marketListing)
    .where(
      and(
        eq(marketListing.id, input.listingId),
        eq(marketListing.format, "fixed_price"),
        eq(marketListing.status, "active"),
      ),
    );
  if (!listing || listing.price === null) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "この出品は購入できません" });
  }
  if (listing.sellerId === buyerId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "自分の出品は購入できません" });
  }
  const price = listing.price;
  if ((await getCoinBalance(ctx.db, buyerId)).total < price) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "pt が足りません" });
  }

  // 先に売約済みにして、同時に購入した2人目を弾く
  const now = new Date();
  const feeAmount = calculateMarketFee(price);
  const [claimed] = await ctx.db
    .update(marketListing)
    .set({ status: "sold", buyerId, soldPrice: price, feeAmount, soldAt: now })
    .where(and(eq(marketListing.id, listing.id), eq(marketListing.status, "active")))
    .returning({ id: marketListing.id });
  if (!claimed) throw new TRPCError({ code: "CONFLICT", message: "売り切れました" });

  try {
    await runBatch(ctx.db, [
      ...(await prepareCoinWithdraw(ctx.db, {
        userId: buyerId,
        amount: price,
        purpose: "market_buy",
        marketListingId: listing.id,
      })),
      ctx.db.insert(coinDeposit).values({
        userId: listing.sellerId,
        source: "market_sale",
        isPaid: false,
        amount: price - feeAmount,
        marketListingId: listing.id,
      }),
      ctx.db
        .update(userCard)
        .set({ userId: buyerId, status: "owned" })
        .where(eq(userCard.id, listing.userCardId)),
      ctx.db
        .insert(cardDiscovery)
        .values({ userId: buyerId, cardId: listing.cardId, firstAcquiredAt: now })
        .onConflictDoNothing(),
    ]);
  } catch (error) {
    await ctx.db
      .update(marketListing)
      .set({ status: "active", buyerId: null, soldPrice: null, feeAmount: null, soldAt: null })
      .where(eq(marketListing.id, listing.id));
    throw error;
  }
  return { cardId: listing.cardId, price };
}
