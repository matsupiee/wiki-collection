import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

import { FREE_PACK_INTERVAL_MS, FREE_PACK_LIMIT } from "./get-free-pack-status";

export async function consumeFreePack(
  db: Database,
  userId: string,
  now: Date,
): Promise<"free_daily"> {
  const time = now.getTime();
  // 満杯ならここから回復を開始し、回復中なら途中まで経った時間を引き継ぐ。
  const [used] = await db
    .insert(freePackAllowance)
    .values({ userId, fullAt: time + FREE_PACK_INTERVAL_MS })
    .onConflictDoUpdate({
      target: freePackAllowance.userId,
      set: { fullAt: sql`max(${freePackAllowance.fullAt}, ${time}) + ${FREE_PACK_INTERVAL_MS}` },
      setWhere: sql`${freePackAllowance.fullAt} <= ${time + (FREE_PACK_LIMIT - 1) * FREE_PACK_INTERVAL_MS}`,
    })
    .returning({ id: freePackAllowance.id });
  if (used) return "free_daily";
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "無料パックの回復までお待ちください",
  });
}
