import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { userCard } from "./user-card";
export const cardFusion = sqliteTable(
  "card_fusion",
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
    baseId: text("base_id")
      .notNull()
      .references(() => userCard.id),
    materialId: text("material_id")
      .notNull()
      .references(() => userCard.id),
    coefficient: real("coefficient").notNull(),
    attackGain: real("attack_gain").notNull(),
    defenseGain: real("defense_gain").notNull(),
  },
  (t) => [uniqueIndex("card_fusion_material").on(t.materialId)],
);
