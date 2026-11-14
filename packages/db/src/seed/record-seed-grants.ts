import { sql } from "drizzle-orm";
import type { Database } from "../index";

// seedで作った各コピーの初回付与を記録する。既に履歴のあるコピーは変更しない。
export async function recordSeedGrants(db: Database) {
  await db.run(sql`INSERT INTO user_card_ownership_transfers
    (id, user_card_id, card_id, from_user_id, to_user_id, reason, created_at)
    SELECT 'seed-grant-' || uc.id, uc.id, uc.card_id, NULL,
      coalesce(po.user_id, uc.owner_id),
      'pack_open',
      coalesce(po.created_at, uc.created_at)
    FROM user_card uc
    LEFT JOIN pack_opening_card poc ON poc.user_card_id = uc.id
    LEFT JOIN pack_opening po ON po.id = poc.pack_opening_id
    WHERE NOT EXISTS (SELECT 1 FROM user_card_ownership_transfers t WHERE t.user_card_id = uc.id)`);
}
