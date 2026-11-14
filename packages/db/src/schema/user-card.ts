import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { userCardStatuses } from "../enums";
import { user } from "./auth";
import { card } from "./card";

// ユーザーが持っている1枚1枚のカード。1枚単位で出品するため枚数ではなく1枚ごとに行を持つ
export const userCard = sqliteTable(
  "user_card",
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
    // いまの持ち主。マーケットで売れたら買い手に書き換える
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    status: text("status", { enum: userCardStatuses }).notNull().default("owned"),
  },
  (table) => [
    index("user_card_owner_status_card_idx").on(table.ownerId, table.status, table.cardId),
  ],
);
