import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { coinPurchase } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { createTestDb } from "../../../../test/create-test-db";
import { createCoinProduct, createUserContext } from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("shop/purchase", () => {
  test("購入した pt は有償 pt として残高に入り、購入の記録が残る", async () => {
    const ctx = await createUserContext(db);
    const product = await createCoinProduct(db, 1000);

    expect(await handler({ input: { productId: product.id }, ctx })).toEqual({ coins: 1000 });

    expect(await getCoinBalance(db, ctx.session.user.id)).toEqual({
      total: 1000,
      paid: 1000,
      free: 0,
    });
    const [purchase] = await db
      .select()
      .from(coinPurchase)
      .where(eq(coinPurchase.userId, ctx.session.user.id));
    expect(purchase).toMatchObject({
      status: "completed",
      amount: 1000,
      currency: "USD",
      coins: 1000,
    });
  });

  test("決済の準備ができていない環境では購入できない", async () => {
    const ctx = await createUserContext(db, "x", "disabled");
    const product = await createCoinProduct(db);
    await expect(handler({ input: { productId: product.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(0);
  });
});
