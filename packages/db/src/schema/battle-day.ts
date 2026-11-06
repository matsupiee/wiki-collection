import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { DailyRanking } from "../battle";
export const battleDay = sqliteTable(
  "battle_day",
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
    date: text("date").notNull(),
    ranking: text("ranking", { mode: "json" }).$type<DailyRanking>().notNull(),
  },
  (t) => [uniqueIndex("battle_day_date").on(t.date)],
);
