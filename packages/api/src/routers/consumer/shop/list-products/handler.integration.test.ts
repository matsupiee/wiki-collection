import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { coinProduct } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { createTestDb } from "../../../../test/create-test-db";
import { createCoinProduct, createUserContext } from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("shop/list-products", () => {
  test("販売中の商品を返し、公開環境ではストア購入だけを有効にする", async () => {
    const product = await createCoinProduct(db, 1000);
    const stopped = await createCoinProduct(db, 500);
    await db.update(coinProduct).set({ isActive: false }).where(eq(coinProduct.id, stopped.id));

    const mock = await handler({ ctx: await createUserContext(db, "a", true) });
    expect(mock.products).toEqual([
      { id: product.id, sku: product.sku, name: product.name, coins: 1000 },
    ]);
    expect(mock.purchasable).toBe(true);

    const published = await handler({ ctx: await createUserContext(db, "b") });
    expect(published.storeEnabled).toBe(true);
    expect(published.purchasable).toBe(false);
  });
});
