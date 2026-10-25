import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { coinWithdrawPurposes } from "../enums";
import { user } from "./auth";
import { auctionBid } from "./auction-bid";
import { marketListing } from "./market-listing";
import { packOpening } from "./pack-opening";

// pt を消費した記録。追記のみ。どの獲得分から払ったかは coin_deposit_withdraw に持つ
export const coinWithdraw = sqliteTable(
  "coin_withdraw",
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
    // ユーザーごとの通し番号。同時に消費されたとき、後から書いた方を unique 制約で失敗させて残高のマイナスを防ぐ
    userSequence: integer("user_sequence").notNull(),
    purpose: text("purpose", { enum: coinWithdrawPurposes }).notNull(),
    amount: integer("amount").notNull(),
    packOpeningId: text("pack_opening_id").references(() => packOpening.id),
    marketListingId: text("market_listing_id").references(() => marketListing.id),
    auctionBidId: text("auction_bid_id").references(() => auctionBid.id),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("coin_withdraw_user_sequence_uidx").on(table.userId, table.userSequence),
    index("coin_withdraw_user_created_idx").on(table.userId, table.createdAt),
  ],
);
