import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { card } from "./card";

// 一度でも手に入れたカード。手放しても消さない。図鑑と NEW 判定に使う
export const cardDiscovery = sqliteTable(
  "card_discovery",
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
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    firstAcquiredAt: integer("first_acquired_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("card_discovery_uidx").on(table.userId, table.cardId)],
);
