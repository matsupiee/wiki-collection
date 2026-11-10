import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

export const FREE_PACK_LIMIT = 10;
export const FREE_PACK_INTERVAL_MS = 10 * 60 * 1000;

export async function getFreePackStatus(db: Database, userId: string, now: Date) {
  const [row] = await db
    .select({ fullAt: freePackAllowance.fullAt })
    .from(freePackAllowance)
    .where(eq(freePackAllowance.userId, userId));
  const fullAt = row?.fullAt ?? 0;
  const missing = Math.max(0, Math.ceil((fullAt - now.getTime()) / FREE_PACK_INTERVAL_MS));
  return {
    remaining: Math.max(0, FREE_PACK_LIMIT - missing),
    limit: FREE_PACK_LIMIT,
    nextRefillAt: missing
      ? new Date(fullAt - (missing - 1) * FREE_PACK_INTERVAL_MS).toISOString()
      : null,
  };
}
