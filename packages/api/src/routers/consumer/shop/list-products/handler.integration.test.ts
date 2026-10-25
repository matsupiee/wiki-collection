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
  test("販売中の商品だけを返す。決済の準備ができていなければ購入できない", async () => {
    const product = await createCoinProduct(db, 1000);
    const stopped = await createCoinProduct(db, 500);
    await db.update(coinProduct).set({ isActive: false }).where(eq(coinProduct.id, stopped.id));

    const mock = await handler({ ctx: await createUserContext(db, "a", "mock") });
    expect(mock.products.map((p) => p.id)).toEqual([product.id]);
    expect(mock.purchasable).toBe(true);

    const disabled = await handler({ ctx: await createUserContext(db, "b", "disabled") });
    expect(disabled.purchasable).toBe(false);
  });
});
