import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, uniqueIndex, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

import { notification } from "./notification";

export const notificationUser = sqliteTable(
  "notification_user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
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
    notificationId: text("notification_id")
      .notNull()
      .references(() => notification.id, { onDelete: "cascade" }),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("notification_user_recipient_idx").on(table.userId, table.notificationId),
    index("notification_user_notification_idx").on(table.notificationId),
  ],
);
