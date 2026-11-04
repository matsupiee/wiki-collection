import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

// 無料パックの残り枠。ユーザー1人につき1行
export const freePackAllowance = sqliteTable("free_pack_allowance", {
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
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // 廃止した登録特典の旧残高。互換性のため保持し、新規作成は 0。無料枠には算入しない
  initialRemaining: integer("initial_remaining").notNull(),
  // 毎日の無料枠を使った日（日本時間の YYYY-MM-DD）と、その日に使った数。日をまたぐと 0 から数え直す
  dailyUsedDate: text("daily_used_date"),
  dailyUsedCount: integer("daily_used_count").notNull().default(0),
});
