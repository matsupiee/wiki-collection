import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { card } from "./card";
import { packOpening } from "./pack-opening";
import { userCard } from "./user-card";

// 開封時の抽選結果。売買で書き換えない。
export const packOpeningCard = sqliteTable(
  "pack_opening_card",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    packOpeningId: text("pack_opening_id")
      .notNull()
      .references(() => packOpening.id),
    userCardId: text("user_card_id")
      .notNull()
      .references(() => userCard.id),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id),
    slot: integer("slot").notNull(),
  },
  (t) => [
    uniqueIndex("pack_opening_card_slot_uidx").on(t.packOpeningId, t.slot),
    uniqueIndex("pack_opening_card_copy_uidx").on(t.userCardId),
    index("pack_opening_card_card_idx").on(t.cardId),
  ],
);
