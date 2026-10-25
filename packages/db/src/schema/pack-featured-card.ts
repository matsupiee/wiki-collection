import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { card } from "./card";
import { pack } from "./pack";

// パックで出やすくするカード
export const packFeaturedCard = sqliteTable(
  "pack_featured_card",
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
    packId: text("pack_id")
      .notNull()
      .references(() => pack.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    // 同じレアリティの候補のなかでの重み。登録のないカードは 1 として扱う
    weight: integer("weight").notNull(),
  },
  (table) => [uniqueIndex("pack_featured_card_uidx").on(table.packId, table.cardId)],
);
