import type { Database } from "@wiki-collection/db";
import type { CoinWithdrawPurpose } from "@wiki-collection/db/enums";
import { coinDeposit, coinDepositWithdraw, coinWithdraw } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );
}

export type CoinWithdrawRefs = {
  packOpeningId?: string;
  marketListingId?: string;
  // 同じ batch で作る入札を指すときは SQL のサブクエリを渡す
  auctionBidId?: string | SQL;
};

// pt を消費する書き込みを組み立てる。呼び出し側が他の書き込みと一緒に db.batch() で実行する。
// 無償 pt から先に、古い獲得分から順に割り当てる。
// 同時に消費されたときは coin_withdraw の (user_id, user_sequence) の unique 制約で後の batch が失敗し、
// batch ごと取り消されるため、残高がマイナスにならない
export async function prepareCoinWithdraw(
  db: Database,
  input: { userId: string; amount: number; purpose: CoinWithdrawPurpose } & CoinWithdrawRefs,
): Promise<BatchItem<"sqlite">[]> {
  const remaining = sql<number>`${coinDeposit.amount} - coalesce(sum(${coinDepositWithdraw.amount}), 0)`;
  const [deposits, [last]] = await Promise.all([
    db
      .select({ id: coinDeposit.id, remaining })
      .from(coinDeposit)
      .leftJoin(coinDepositWithdraw, eq(coinDepositWithdraw.depositId, coinDeposit.id))
      .where(eq(coinDeposit.userId, input.userId))
      .groupBy(coinDeposit.id)
      .having(sql`${remaining} > 0`)
      .orderBy(asc(coinDeposit.isPaid), asc(coinDeposit.createdAt), asc(coinDeposit.id)),
    db
      .select({ sequence: sql<number | null>`max(${coinWithdraw.userSequence})` })
      .from(coinWithdraw)
      .where(eq(coinWithdraw.userId, input.userId)),
  ]);

  const allocations: { depositId: string; amount: number }[] = [];
  let rest = input.amount;
  for (const deposit of deposits) {
    if (rest <= 0) break;
    const amount = Math.min(Number(deposit.remaining), rest);
    allocations.push({ depositId: deposit.id, amount });
    rest -= amount;
  }
  if (rest > 0) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "pt が足りません" });
  }

  const userSequence = Number(last?.sequence ?? 0) + 1;
  const withdrawId = sql`(select ${coinWithdraw.id} from ${coinWithdraw} where ${and(
    eq(coinWithdraw.userId, input.userId),
    eq(coinWithdraw.userSequence, userSequence),
  )})`;
  return [
    db.insert(coinWithdraw).values({
      userId: input.userId,
      userSequence,
      purpose: input.purpose,
      amount: input.amount,
      packOpeningId: input.packOpeningId,
      marketListingId: input.marketListingId,
      auctionBidId: input.auctionBidId,
    }),
    // D1 は1文あたりのバインド変数が 100 個までなので、割り当てが多いときは文を分ける
    ...chunk(allocations, 15).map((rows) =>
      db
        .insert(coinDepositWithdraw)
        .values(rows.map((a) => ({ depositId: a.depositId, withdrawId, amount: a.amount }))),
    ),
  ];
}
