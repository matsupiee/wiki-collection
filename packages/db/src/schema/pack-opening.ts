import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { packPayments } from "../enums";
import { user } from "./auth";
import { pack } from "./pack";

// パックを1回開けた記録。抽選結果は user_card に残る
export const packOpening = sqliteTable(
  "pack_opening",
  {
    id: text("id")
      .$defaultFn(() => createId())
      .primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packId: text("pack_id")
      .notNull()
      .references(() => pack.id),
    payment: text("payment", { enum: packPayments }).notNull(),
    coinsSpent: integer("coins_spent").notNull().default(0),
    // 開封演出を最後まで見た日時。null の開封は演出を再開できる
    revealedAt: integer("revealed_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("pack_opening_user_created_idx").on(table.userId, table.createdAt)],
);
