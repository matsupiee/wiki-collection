import { sql } from "drizzle-orm";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import {
  catalogBucket,
  decodePart,
  latestKey,
  manifestSchema,
  partKey,
  requiredEnv,
} from "../../../wiki-import/src/catalog";
import { loadRecords } from "../../../wiki-import/src/load-cards";
import { createDb } from "../index";
import { rarityThresholds } from "../rarity";

const bucket = catalogBucket();
const databaseId = requiredEnv("D1_DATABASE_ID");
const accountId = requiredEnv("R2_ACCOUNT_ID");
const manifest = manifestSchema.parse(JSON.parse(await bucket.file(latestKey).text()));
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
        { binding: "DB", database_name: "wiki-collection", database_id: databaseId, remote: true },
      ],
    }),
  );
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath,
    persist: false,
    remoteBindings: true,
  });
  try {
    const db = createDb(proxy.env);
    for (let index = 0; index < manifest.parts; index++) {
      const file = bucket.file(partKey(manifest.snapshot, index));
      const part = decodePart(await file.arrayBuffer());
      await loadRecords(db, { ...part, thresholds: index === 0 ? rarityThresholds : null });
      console.log(`${index + 1}/${manifest.parts} (${part.cards.length} cards)`);
    }
    await db.run(sql`WITH totals AS (
      SELECT g.id, row_number() OVER (ORDER BY count(c.id) DESC, g.slug) - 1 AS position
      FROM genre g LEFT JOIN card c ON c.genre_id = g.id GROUP BY g.id
    ) UPDATE genre SET sort_order = totals.position FROM totals WHERE genre.id = totals.id`);
  } finally {
    await proxy.dispose();
  }
} finally {
  await rm(dir, { force: true, recursive: true });
}
