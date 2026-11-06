import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { userCard } from "./user-card";
export const battleTeam = sqliteTable(
  "battle_team",
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
    slot: integer("slot").notNull(),
    name: text("name").notNull(),
    member1: text("member_1")
      .notNull()
      .references(() => userCard.id),
    member2: text("member_2")
      .notNull()
      .references(() => userCard.id),
    member3: text("member_3")
      .notNull()
      .references(() => userCard.id),
  },
  (t) => [
    uniqueIndex("battle_team_user_slot").on(t.userId, t.slot),
    check("battle_team_slot", sql`${t.slot} between 1 and 3`),
    check(
      "battle_team_distinct",
      sql`${t.member1} <> ${t.member2} and ${t.member1} <> ${t.member3} and ${t.member2} <> ${t.member3}`,
    ),
  ],
);
