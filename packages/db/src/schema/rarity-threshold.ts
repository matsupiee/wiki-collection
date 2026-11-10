import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { rarities } from "../enums";

// レアリティごとの月間閲覧数の下限。レジェンド10万回、SR5万回、R1万回。
export const rarityThreshold = sqliteTable(
  "rarity_threshold",
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
    wikiLang: text("wiki_lang").notNull(),
    // コモンは下限がないので行を作らない
    rarity: text("rarity", { enum: rarities }).notNull(),
    minMonthlyPageviews: integer("min_monthly_pageviews").notNull(),
  },
  (table) => [uniqueIndex("rarity_threshold_uidx").on(table.wikiLang, table.rarity)],
);
