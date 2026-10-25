import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, sql } from "drizzle-orm";

import { DAILY_FREE_PACKS, INITIAL_FREE_PACKS } from "./get-free-pack-status";
import { toJstDate } from "./to-jst-date";

// 無料枠を1つ使う。日ごとの枠は持ち越せないので先に使い、なければ登録時の枠を使う。
// 同時に開封されても枠を超えないよう、条件付き UPDATE で1文ずつ減らす
export async function consumeFreePack(
  db: Database,
  userId: string,
  now: Date,
): Promise<"free_daily" | "free_initial"> {
  await db
    .insert(freePackAllowance)
    .values({ userId, initialRemaining: INITIAL_FREE_PACKS })
    .onConflictDoNothing({ target: freePackAllowance.userId });

  const today = toJstDate(now);
  const daily = await db
    .update(freePackAllowance)
    .set({
      dailyUsedCount: sql`case when ${freePackAllowance.dailyUsedDate} = ${today} then ${freePackAllowance.dailyUsedCount} + 1 else 1 end`,
      dailyUsedDate: today,
    })
    .where(
      and(
        eq(freePackAllowance.userId, userId),
        sql`(${freePackAllowance.dailyUsedDate} is not ${today} or ${freePackAllowance.dailyUsedCount} < ${DAILY_FREE_PACKS})`,
      ),
    )
    .returning({ id: freePackAllowance.id });
  if (daily.length > 0) return "free_daily";

  const initial = await db
    .update(freePackAllowance)
    .set({ initialRemaining: sql`${freePackAllowance.initialRemaining} - 1` })
    .where(and(eq(freePackAllowance.userId, userId), gt(freePackAllowance.initialRemaining, 0)))
    .returning({ id: freePackAllowance.id });
  if (initial.length > 0) return "free_initial";

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "今日の無料パックはすべて開封しました",
  });
}
