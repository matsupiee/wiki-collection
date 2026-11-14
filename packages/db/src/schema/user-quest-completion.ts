import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { packOpening } from "./pack-opening";

export const userQuestCompletion = sqliteTable(
  "user_quest_completion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questKey: text("quest_key").notNull(),
    reward: integer("reward").notNull(),
    packOpeningId: text("pack_opening_id").references(() => packOpening.id),
  },
  (t) => [
    uniqueIndex("quest_completion_user_key_uidx").on(t.userId, t.questKey),
    index("quest_completion_opening_idx").on(t.packOpeningId),
  ],
);
