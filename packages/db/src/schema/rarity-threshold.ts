import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { rarities } from "../enums";

// レアリティごとの月間閲覧数の下限。最初の取り込みで閲覧数の順位から決め、あとから足すカードもこの値で判定する。
// 取り込むたびに順位で決め直すと、同じ閲覧数でも取り込んだ時期によってレアリティが変わってしまうため
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
