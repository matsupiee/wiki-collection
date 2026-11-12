import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { createDb, type Database } from "../index";
import { requiredEnv } from "../../../wiki-import/src/catalog";

export async function withProductionDb<T>(work: (db: Database) => Promise<T>) {
  const databaseId = requiredEnv("D1_DATABASE_ID");
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const dir = await mkdtemp(path.join(tmpdir(), "wiki-prod-"));
  try {
    const configPath = path.join(dir, "wrangler.json");
    await writeFile(
      configPath,
      JSON.stringify({
        name: "wiki-catalog-seed",
        compatibility_date: "2026-09-01",
        account_id: accountId,
        d1_databases: [
          {
            binding: "DB",
            database_name: "wiki-collection",
            database_id: databaseId,
            remote: true,
          },
        ],
      }),
    );
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath,
      persist: false,
      remoteBindings: true,
    });
    try {
      return await work(createDb(proxy.env));
    } finally {
      await proxy.dispose();
    }
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}
