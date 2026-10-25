import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { purchaseProviders, purchaseStatuses } from "../enums";
import { user } from "./auth";
import { coinProduct } from "./coin-product";

// 課金の記録。Webhook が二重に届いても二重に付与しないよう決済 ID に unique 制約をつける
export const coinPurchase = sqliteTable(
  "coin_purchase",
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
    coinProductId: text("coin_product_id")
      .notNull()
      .references(() => coinProduct.id),
    provider: text("provider", { enum: purchaseProviders }).notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    // 商品の価格改定に影響されないよう、支払われた額と付与した pt を複製して持つ
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    coins: integer("coins").notNull(),
    status: text("status", { enum: purchaseStatuses }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("coin_purchase_provider_payment_uidx").on(table.provider, table.providerPaymentId),
  ],
);
