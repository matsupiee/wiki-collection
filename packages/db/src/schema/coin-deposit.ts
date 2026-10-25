import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { coinDepositSources } from "../enums";
import { user } from "./auth";
import { auctionBid } from "./auction-bid";
import { coinPurchase } from "./coin-purchase";
import { marketListing } from "./market-listing";
import { userCard } from "./user-card";

// pt を獲得した記録。追記のみ。残高は coin_deposit から coin_deposit_withdraw を引いて求める
export const coinDeposit = sqliteTable(
  "coin_deposit",
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
    source: text("source", { enum: coinDepositSources }).notNull(),
    // 課金で得た有償 pt なら true。資金決済法で有償分の未使用残高を管理するため分けて持つ
    isPaid: integer("is_paid", { mode: "boolean" }).notNull(),
    amount: integer("amount").notNull(),
    coinPurchaseId: text("coin_purchase_id").references(() => coinPurchase.id),
    userCardId: text("user_card_id").references(() => userCard.id),
    marketListingId: text("market_listing_id").references(() => marketListing.id),
    auctionBidId: text("auction_bid_id").references(() => auctionBid.id),
    note: text("note"),
  },
  (table) => [index("coin_deposit_user_created_idx").on(table.userId, table.createdAt)],
);
