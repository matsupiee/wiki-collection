import type { Database } from "@wiki-collection/db";
import { freePackAllowance } from "@wiki-collection/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { FREE_PACK_INTERVAL_MS } from "./get-free-pack-status";

export async function restoreFreePack(db: Database, userId: string): Promise<void> {
  await db
    .update(freePackAllowance)
    .set({ fullAt: sql`${freePackAllowance.fullAt} - ${FREE_PACK_INTERVAL_MS}` })
    .where(eq(freePackAllowance.userId, userId));
}
