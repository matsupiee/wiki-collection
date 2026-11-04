import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { and, eq, gt, sql } from "drizzle-orm";

import { toJstDate } from "./to-jst-date";

// 開封の書き込みに失敗したとき、consumeFreePack で使った枠を戻す
export async function restoreFreePack(db: Database, userId: string, now: Date): Promise<void> {
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
