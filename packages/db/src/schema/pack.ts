import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { packTypes } from "../enums";
import { genre } from "./genre";

export const pack = sqliteTable("pack", {
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
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: packTypes }).notNull(),
  // null なら全ジャンルから排出する
  genreId: text("genre_id").references(() => genre.id),
  priceCoins: integer("price_coins"),
  cardsPerPack: integer("cards_per_pack").notNull().default(5),
  imageUrl: text("image_url"),
  colorHex: text("color_hex").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
