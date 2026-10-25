import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// カードとジャンルパックの分類。Wikipedia の記事に紐づく Wikidata の「分類」（instance of、P31）をそのまま使う
export const genre = sqliteTable("genre", {
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
  // Wikidata の ID（例: Q5）。seed のサンプルは sample- で始まる
  slug: text("slug").notNull().unique(),
  // Wikidata の日本語ラベル（例: 人間）
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
