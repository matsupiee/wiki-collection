import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { bidStatuses } from "../enums";
import { user } from "./auth";
import { marketListing } from "./market-listing";

// オークションへの入札
export const auctionBid = sqliteTable(
  "auction_bid",
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
    listingId: text("listing_id")
      .notNull()
      .references(() => marketListing.id, { onDelete: "cascade" }),
    bidderId: text("bidder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // 出品ごとの通し番号。同時に入札されたとき、後から書いた方を unique 制約で失敗させる
    sequence: integer("sequence").notNull(),
    amount: integer("amount").notNull(),
    status: text("status", { enum: bidStatuses }).notNull(),
  },
  (table) => [
    uniqueIndex("auction_bid_sequence_uidx").on(table.listingId, table.sequence),
    index("auction_bid_bidder_idx").on(table.bidderId, table.createdAt),
  ],
);
