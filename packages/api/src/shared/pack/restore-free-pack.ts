import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { and, eq, gt, sql } from "drizzle-orm";

import { toJstDate } from "./to-jst-date";

// 開封の書き込みに失敗したとき、consumeFreePack で使った枠を戻す
export async function restoreFreePack(
  db: Database,
  userId: string,
  payment: "free_daily" | "free_initial",
  now: Date,
): Promise<void> {
  if (payment === "free_initial") {
    await db
      .update(freePackAllowance)
      .set({ initialRemaining: sql`${freePackAllowance.initialRemaining} + 1` })
      .where(eq(freePackAllowance.userId, userId));
    return;
  }
  await db
    .update(freePackAllowance)
    .set({ dailyUsedCount: sql`${freePackAllowance.dailyUsedCount} - 1` })
    .where(
      and(
        eq(freePackAllowance.userId, userId),
        eq(freePackAllowance.dailyUsedDate, toJstDate(now)),
        gt(freePackAllowance.dailyUsedCount, 0),
      ),
    );
}
