import type { Database } from "@wiki-collection/db";
import { coinDeposit, coinDepositWithdraw, coinWithdraw } from "@wiki-collection/db/schema/index";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

// 抜かれた入札で押さえていた pt を返す書き込みを組み立てる。
// 消費の記録は消さず、払ったときと同じ有償・無償の内訳で新しい獲得（bid_refund）を作る
export async function prepareBidRefund(
  db: Database,
  bid: { id: string; bidderId: string },
): Promise<BatchItem<"sqlite">[]> {
  const paidBreakdown = await db
    .select({
      isPaid: coinDeposit.isPaid,
      amount: sql<number>`sum(${coinDepositWithdraw.amount})`,
    })
    .from(coinWithdraw)
    .innerJoin(coinDepositWithdraw, eq(coinDepositWithdraw.withdrawId, coinWithdraw.id))
    .innerJoin(coinDeposit, eq(coinDeposit.id, coinDepositWithdraw.depositId))
    .where(eq(coinWithdraw.auctionBidId, bid.id))
    .groupBy(coinDeposit.isPaid);
  if (paidBreakdown.length === 0) return [];
  return [
    db.insert(coinDeposit).values(
      paidBreakdown.map((row) => ({
        userId: bid.bidderId,
        source: "bid_refund" as const,
        isPaid: row.isPaid,
        amount: Number(row.amount),
        auctionBidId: bid.id,
      })),
    ),
  ];
}
