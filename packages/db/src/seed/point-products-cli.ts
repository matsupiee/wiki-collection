import type { Database } from "../index";
import { coinProduct } from "../schema/coin-product";
import { openLocalDb } from "./local-db";
import { coinProducts } from "./master-data";
import { withProductionDb } from "./prod-db";

async function seed(db: Database) {
  await db
    .insert(coinProduct)
    .values(coinProducts)
    .onConflictDoNothing({ target: coinProduct.sku });
}
if (process.argv.includes("--production")) {
  await withProductionDb(seed);
} else {
  const { db, dispose } = await openLocalDb();
  try {
    await seed(db);
  } finally {
    await dispose();
  }
}
