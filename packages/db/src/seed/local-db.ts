import path from "node:path";

import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";

import { createDb } from "../index";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");

// apps/web の vite.local.config.ts（bun run dev:local）と同じローカル D1 を開き、マイグレーションを当てる
export async function openLocalDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: path.join(repoRoot, "apps/web/wrangler.local.jsonc"),
    persist: { path: path.join(repoRoot, ".wrangler/state/v3") },
  });
  const db = createDb({ DB: proxy.env.DB });
  await migrate(db, { migrationsFolder: path.join(repoRoot, "packages/db/src/migrations") });
  return { db, dispose: () => proxy.dispose() };
}
