import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { userCardStatuses } from "../enums";
import { user } from "./auth";
import { card } from "./card";
import { packOpening } from "./pack-opening";

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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    status: text("status", { enum: userCardStatuses }).notNull().default("owned"),
    packOpeningId: text("pack_opening_id").references(() => packOpening.id),
    // 開封演出でめくる順番。レアリティの低い順に並べてある
    slot: integer("slot"),
    isNewOnAcquire: integer("is_new_on_acquire", { mode: "boolean" }).notNull().default(false),
    redeemedAt: integer("redeemed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("user_card_user_status_card_idx").on(table.userId, table.status, table.cardId),
    index("user_card_opening_idx").on(table.packOpeningId),
  ],
);
