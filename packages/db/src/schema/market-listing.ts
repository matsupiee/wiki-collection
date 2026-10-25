import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { listingFormats, listingStatuses } from "../enums";
import { user } from "./auth";
import { card } from "./card";
import { userCard } from "./user-card";

// カード1枚の出品。フリマとオークションを1つのテーブルで持つ
export const marketListing = sqliteTable(
  "market_listing",
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
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userCardId: text("user_card_id")
      .notNull()
      .references(() => userCard.id),
    // 検索用に複製する
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    format: text("format", { enum: listingFormats }).notNull(),
    status: text("status", { enum: listingStatuses }).notNull().default("active"),
    price: integer("price"),
    startPrice: integer("start_price"),
    currentPrice: integer("current_price"),
    bidCount: integer("bid_count").notNull().default(0),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    buyerId: text("buyer_id").references(() => user.id),
    soldPrice: integer("sold_price"),
    feeAmount: integer("fee_amount"),
    soldAt: integer("sold_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    // 同じカードを二重に出品させない
    uniqueIndex("market_listing_active_card_uidx")
      .on(table.userCardId)
      .where(sql`${table.status} = 'active'`),
    index("market_listing_search_idx").on(table.status, table.format, table.cardId),
    index("market_listing_ends_idx").on(table.status, table.endsAt),
    index("market_listing_seller_idx").on(table.sellerId, table.createdAt),
  ],
);
