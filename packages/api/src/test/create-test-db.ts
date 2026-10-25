import path from "node:path";

import { createDb, type Database } from "@wiki-collection/db";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";

const configPath = path.resolve(import.meta.dirname, "../../../../apps/web/wrangler.local.jsonc");
const migrationsFolder = path.resolve(import.meta.dirname, "../../../db/src/migrations");

// Miniflare のメモリ上の D1 を作り、マイグレーションを当てた Database を返す。
// 本番と同じ D1 の挙動（batch のトランザクション、制約違反）でテストするため、SQLite のモックではなく Miniflare を使う
export async function createTestDb(): Promise<{ db: Database; dispose: () => Promise<void> }> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath, persist: false });
  const db = createDb({ DB: proxy.env.DB });
  await migrate(db, { migrationsFolder });
  return { db, dispose: () => proxy.dispose() };
}
