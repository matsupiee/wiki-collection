import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { toJstDate } from "./to-jst-date";

export const INITIAL_FREE_PACKS = 20;
export const DAILY_FREE_PACKS = 10;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function nextJstMidnight(now: Date): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  jst.setUTCHours(24, 0, 0, 0);
  return new Date(jst.getTime() - JST_OFFSET_MS);
}

export type FreePackStatus = {
  initialRemaining: number;
  dailyRemaining: number;
  dailyLimit: number;
  remaining: number;
  // 毎日の無料枠が次に 10 に戻る日時（日本時間の 0 時）
  dailyResetsAt: Date;
};

// 無料パックの残り枠。登録時の 20 パックと、日本時間の日ごとに 10 パック（貯まらない）の合計
export async function getFreePackStatus(
  db: Database,
  userId: string,
  now: Date,
): Promise<FreePackStatus> {
  const [row] = await db
    .select()
    .from(freePackAllowance)
    .where(eq(freePackAllowance.userId, userId));
  const initialRemaining = row?.initialRemaining ?? INITIAL_FREE_PACKS;
  const usedToday = row && row.dailyUsedDate === toJstDate(now) ? row.dailyUsedCount : 0;
  const dailyRemaining = Math.max(DAILY_FREE_PACKS - usedToday, 0);
  return {
    initialRemaining,
    dailyRemaining,
    dailyLimit: DAILY_FREE_PACKS,
    remaining: initialRemaining + dailyRemaining,
    dailyResetsAt: nextJstMidnight(now),
  };
}
