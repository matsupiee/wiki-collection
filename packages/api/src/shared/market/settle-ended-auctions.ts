import type { Database } from "@wiki-collection/db";
import {
  auctionBid,
  cardDiscovery,
  coinDeposit,
  marketListing,
  userCard,
} from "@wiki-collection/db/schema/index";
import { and, asc, eq, lte } from "drizzle-orm";

import { runBatch } from "../coin/run-batch";
import { calculateMarketFee } from "./calculate-market-fee";

// 終了時刻を過ぎたオークションを締める。入札があれば最高額の入札者が落札し、なければ期限切れにしてカードを出品者に戻す。
// 一覧や詳細を開いたときに呼ぶ。同じ出品を二重に締めないよう、status = 'active' を条件に更新してから書き込む
export async function settleEndedAuctions(
  db: Database,
  now: Date,
  options: { listingId?: string } = {},
): Promise<void> {
  const ended = await db
    .select()
    .from(marketListing)
    .where(
      and(
        eq(marketListing.status, "active"),
        eq(marketListing.format, "auction"),
        lte(marketListing.endsAt, now),
        options.listingId ? eq(marketListing.id, options.listingId) : undefined,
      ),
    )
    .orderBy(asc(marketListing.endsAt))
    .limit(20);

  for (const listing of ended) {
    const [leading] = await db
      .select()
      .from(auctionBid)
      .where(and(eq(auctionBid.listingId, listing.id), eq(auctionBid.status, "leading")));

    if (!leading) {
      const claimed = await db
        .update(marketListing)
        .set({ status: "expired" })
        .where(and(eq(marketListing.id, listing.id), eq(marketListing.status, "active")))
        .returning({ id: marketListing.id });
      if (claimed.length === 0) continue;
      await db.update(userCard).set({ status: "owned" }).where(eq(userCard.id, listing.userCardId));
      continue;
    }

    const feeAmount = calculateMarketFee(leading.amount);
    const claimed = await db
      .update(marketListing)
      .set({
        status: "sold",
        buyerId: leading.bidderId,
        soldPrice: leading.amount,
        feeAmount,
        soldAt: listing.endsAt,
      })
      .where(and(eq(marketListing.id, listing.id), eq(marketListing.status, "active")))
      .returning({ id: marketListing.id });
    if (claimed.length === 0) continue;

    // 落札者の pt は入札時に消費済み。出品者に売上を入れ、カードを落札者に移す
    await runBatch(db, [
      db.update(auctionBid).set({ status: "won" }).where(eq(auctionBid.id, leading.id)),
      db
        .update(userCard)
        .set({ userId: leading.bidderId, status: "owned" })
        .where(eq(userCard.id, listing.userCardId)),
      db
        .insert(cardDiscovery)
        .values({ userId: leading.bidderId, cardId: listing.cardId, firstAcquiredAt: now })
        .onConflictDoNothing(),
      db.insert(coinDeposit).values({
        userId: listing.sellerId,
        source: "market_sale",
        isPaid: false,
        amount: leading.amount - feeAmount,
        marketListingId: listing.id,
      }),
    ]);
  }
}
