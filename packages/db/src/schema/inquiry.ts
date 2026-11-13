import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const supportAgent = sqliteTable("support_agent", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const inquiry = sqliteTable(
  "inquiry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    answer: text("answer"),
    answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("inquiry_owner_idx").on(table.userId, table.createdAt),
    index("inquiry_answered_idx").on(table.answeredAt, table.createdAt),
  ],
);
