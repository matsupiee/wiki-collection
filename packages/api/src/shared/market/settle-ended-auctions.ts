import type { Database } from "@wiki-collection/db";
import {
  auctionBid,
  userCardOwnershipTransfers,
  coinDeposit,
  marketListing,
  userCard,
} from "@wiki-collection/db/schema/index";
import { and, asc, eq, lte, sql } from "drizzle-orm";

import { runBatch } from "../coin/run-batch";

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
    const canSettle = and(
      eq(marketListing.id, listing.id),
      eq(marketListing.status, "active"),
      lte(marketListing.endsAt, now),
      eq(marketListing.bidCount, listing.bidCount),
    );
    const [leading] = await db
      .select()
      .from(auctionBid)
      .where(and(eq(auctionBid.listingId, listing.id), eq(auctionBid.status, "leading")));

    if (!leading) {
      const claimed = await db
        .update(marketListing)
        .set({ status: "expired" })
        .where(canSettle)
        .returning({ id: marketListing.id });
      if (claimed.length === 0) continue;
      await db.update(userCard).set({ status: "owned" }).where(eq(userCard.id, listing.userCardId));
      continue;
    }

    // 一意な移転IDをこのbatchの実行権として使い、成立・所有者・履歴・売上を一括確定する。
    const transferId = crypto.randomUUID();
    const transferred = sql`exists (select 1 from ${userCardOwnershipTransfers}
      where ${userCardOwnershipTransfers.id} = ${transferId})`;
    await runBatch(db, [
      db.insert(userCardOwnershipTransfers).select(
        db
          .select({
            id: sql<string>`${transferId}`.as("id"),
            userCardId: marketListing.userCardId,
            cardId: marketListing.cardId,
            fromUserId: marketListing.sellerId,
            toUserId: sql<string>`${leading.bidderId}`.as("toUserId"),
            reason: sql<"market_sale">`'market_sale'`.as("reason"),
            marketListingId: marketListing.id,
            createdAt: sql<number>`${listing.endsAt!.getTime()}`.as("createdAt"),
          })
          .from(marketListing)
          .where(canSettle),
      ),
      db
        .update(marketListing)
        .set({
          status: "sold",
          buyerId: leading.bidderId,
          soldPrice: leading.amount,
          soldAt: listing.endsAt,
        })
        .where(and(eq(marketListing.id, listing.id), transferred)),
      db
        .update(auctionBid)
        .set({ status: "won" })
        .where(and(eq(auctionBid.id, leading.id), transferred)),
      db
        .update(userCard)
        .set({ ownerId: leading.bidderId, status: "owned" })
        .where(and(eq(userCard.id, listing.userCardId), transferred)),
      db.insert(coinDeposit).select(
        db
          .select({
            id: sql<string>`${crypto.randomUUID()}`.as("id"),
            createdAt: sql<number>`${now.getTime()}`.as("createdAt"),
            updatedAt: sql<number>`${now.getTime()}`.as("updatedAt"),
            userId: marketListing.sellerId,
            source: sql<"market_sale">`'market_sale'`.as("source"),
            isPaid: sql<boolean>`0`.as("isPaid"),
            amount: sql<number>`${leading.amount}`.as("amount"),
            coinPurchaseId: sql<string | null>`null`.as("coinPurchaseId"),
            marketListingId: marketListing.id,
            auctionBidId: sql<string | null>`null`.as("auctionBidId"),
            note: sql<string | null>`null`.as("note"),
          })
          .from(marketListing)
          .where(and(eq(marketListing.id, listing.id), transferred)),
      ),
    ]);
  }
}
