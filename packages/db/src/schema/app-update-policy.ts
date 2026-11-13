import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appUpdatePolicy = sqliteTable("app_update_policy", {
  platform: text("platform", { enum: ["ios", "android"] }).primaryKey(),
  minimumVersion: text("minimum_version").notNull(),
});
