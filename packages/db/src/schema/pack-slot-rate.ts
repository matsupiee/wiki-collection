import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { rarities } from "../enums";
import { pack } from "./pack";

// パックの何枚目に、どのレアリティが、どの重みで出るか
export const packSlotRate = sqliteTable(
  "pack_slot_rate",
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
    slot: integer("slot").notNull(),
    rarity: text("rarity", { enum: rarities }).notNull(),
    // 同じ枠の重みの合計で割った値が排出確率になる
    weight: integer("weight").notNull(),
  },
  (table) => [uniqueIndex("pack_slot_rate_uidx").on(table.packId, table.slot, table.rarity)],
);
