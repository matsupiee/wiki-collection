import { inArray, sql, and } from "drizzle-orm";
import type { Database } from "../index";
import { userCardOwnershipTransfers as transfers } from "../schema";

const oldReasons = sql`${transfers.reason} in ('admin_grant', 'legacy_acquisition')`;

export async function countOldOwnershipReasons(db: Database) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transfers)
    .where(oldReasons);
  return Number(row!.count);
}

// 明示実行専用。50行ずつ処理し、途中終了後も未更新行から再開できる。
export async function normalizeOwnershipReasons(db: Database) {
  let updated = 0;
  while (true) {
    const rows = await db.select({ id: transfers.id }).from(transfers).where(oldReasons).limit(50);
    if (!rows.length) return updated;
    const changed = await db
      .update(transfers)
      .set({ reason: "pack_open" })
      .where(
        and(
          oldReasons,
          inArray(
            transfers.id,
            rows.map((row) => row.id),
          ),
        ),
      )
      .returning({ id: transfers.id });
    updated += changed.length;
  }
}
