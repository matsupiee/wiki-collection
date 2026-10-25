import type { Database } from "@wiki-collection/db";
import { coinDeposit, coinDepositWithdraw } from "@wiki-collection/db/schema/index";
import { eq, sql } from "drizzle-orm";

export type CoinBalance = { total: number; paid: number; free: number };

// pt の残高。獲得（coin_deposit）の合計から、消費の割り当て（coin_deposit_withdraw）の合計を引いて求める
export async function getCoinBalance(db: Database, userId: string): Promise<CoinBalance> {
  const [deposited, consumed] = await Promise.all([
    db
      .select({
        isPaid: coinDeposit.isPaid,
        amount: sql<number>`coalesce(sum(${coinDeposit.amount}), 0)`,
      })
      .from(coinDeposit)
      .where(eq(coinDeposit.userId, userId))
      .groupBy(coinDeposit.isPaid),
    db
      .select({
        isPaid: coinDeposit.isPaid,
        amount: sql<number>`coalesce(sum(${coinDepositWithdraw.amount}), 0)`,
      })
      .from(coinDepositWithdraw)
      .innerJoin(coinDeposit, eq(coinDeposit.id, coinDepositWithdraw.depositId))
      .where(eq(coinDeposit.userId, userId))
      .groupBy(coinDeposit.isPaid),
  ]);
  const sum = (rows: { isPaid: boolean; amount: number }[], isPaid: boolean) =>
    rows.filter((r) => r.isPaid === isPaid).reduce((total, r) => total + Number(r.amount), 0);
  const paid = sum(deposited, true) - sum(consumed, true);
  const free = sum(deposited, false) - sum(consumed, false);
  return { total: paid + free, paid, free };
}
