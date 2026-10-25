import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { rarities } from "../enums";
import { genre } from "./genre";

// Wikipedia の記事1ページに対応するカードの種類。所持品は user_card
export const card = sqliteTable(
  "card",
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
    wikiPageId: integer("wiki_page_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    genreId: text("genre_id")
      .notNull()
      .references(() => genre.id),
    // カードを作った時点で固定する。閲覧数が変わってもマーケットでの価値が勝手に動かないようにするため
    rarity: text("rarity", { enum: rarities }).notNull(),
    monthlyPageviews: integer("monthly_pageviews").notNull(),
    pageviewsMeasuredAt: integer("pageviews_measured_at", { mode: "timestamp_ms" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    uniqueIndex("card_wiki_page_uidx").on(table.wikiLang, table.wikiPageId),
    index("card_genre_rarity_idx").on(table.genreId, table.rarity, table.isActive),
  ],
);
