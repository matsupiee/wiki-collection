import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { card } from "./card";
import { userCard } from "./user-card";
import { marketListing } from "./market-listing";

// 追記のみ。初回付与は fromUserId = null。seed・旧データの獲得記録も pack_open として扱う。
export const userCardOwnershipTransfers = sqliteTable(
  "user_card_ownership_transfers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userCardId: text("user_card_id").references(() => userCard.id),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    fromUserId: text("from_user_id").references(() => user.id),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason", {
      enum: ["pack_open", "market_sale"],
    }).notNull(),
    marketListingId: text("market_listing_id").references(() => marketListing.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("ownership_transfers_recipient_card_idx").on(t.toUserId, t.cardId),
    index("ownership_transfers_sender_idx").on(t.fromUserId),
    index("ownership_transfers_copy_time_idx").on(t.userCardId, t.createdAt),
    uniqueIndex("ownership_transfers_listing_uidx").on(t.marketListingId),
  ],
);
