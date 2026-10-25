import { coinDeposit, coinDepositWithdraw, coinWithdraw } from "@wiki-collection/db/schema/index";
import { desc, eq, inArray, sql } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { CoinListHistoryOutput } from "./route";

const LIMIT = 50;

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<CoinListHistoryOutput> {
  const userId = ctx.session.user.id;
  const [deposits, withdraws] = await Promise.all([
    ctx.db
      .select()
      .from(coinDeposit)
      .where(eq(coinDeposit.userId, userId))
      .orderBy(desc(coinDeposit.createdAt))
      .limit(LIMIT),
    ctx.db
      .select()
      .from(coinWithdraw)
      .where(eq(coinWithdraw.userId, userId))
      .orderBy(desc(coinWithdraw.createdAt))
      .limit(LIMIT),
  ]);

  const breakdown =
    withdraws.length === 0
      ? []
      : await ctx.db
          .select({
            withdrawId: coinDepositWithdraw.withdrawId,
            isPaid: coinDeposit.isPaid,
            amount: sql<number>`sum(${coinDepositWithdraw.amount})`,
          })
          .from(coinDepositWithdraw)
          .innerJoin(coinDeposit, eq(coinDeposit.id, coinDepositWithdraw.depositId))
          .where(
            inArray(
              coinDepositWithdraw.withdrawId,
              withdraws.map((w) => w.id),
            ),
          )
          .groupBy(coinDepositWithdraw.withdrawId, coinDeposit.isPaid);
  const sumFor = (withdrawId: string, isPaid: boolean) =>
    breakdown
      .filter((b) => b.withdrawId === withdrawId && b.isPaid === isPaid)
      .reduce((sum, b) => sum + Number(b.amount), 0);

  const entries: CoinListHistoryOutput["entries"] = [
    ...deposits.map((d) => ({
      kind: "deposit" as const,
      id: d.id,
      createdAt: d.createdAt.toISOString(),
      source: d.source,
      isPaid: d.isPaid,
      amount: d.amount,
    })),
    ...withdraws.map((w) => ({
      kind: "withdraw" as const,
      id: w.id,
      createdAt: w.createdAt.toISOString(),
      purpose: w.purpose,
      amount: w.amount,
      paidAmount: sumFor(w.id, true),
      freeAmount: sumFor(w.id, false),
    })),
  ];
  return {
    entries: entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIMIT),
  };
}
