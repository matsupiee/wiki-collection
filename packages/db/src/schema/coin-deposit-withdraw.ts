import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { coinDeposit } from "./coin-deposit";
import { coinWithdraw } from "./coin-withdraw";

// 1回の消費を、どの獲得分からいくら払ったかに割り当てる
export const coinDepositWithdraw = sqliteTable(
  "coin_deposit_withdraw",
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
    depositId: text("deposit_id")
      .notNull()
      .references(() => coinDeposit.id),
    withdrawId: text("withdraw_id")
      .notNull()
      .references(() => coinWithdraw.id),
    amount: integer("amount").notNull(),
  },
  (table) => [
    uniqueIndex("coin_deposit_withdraw_uidx").on(table.depositId, table.withdrawId),
    index("coin_deposit_withdraw_withdraw_idx").on(table.withdrawId),
  ],
);
