import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { SignedDataVerifier, Environment } from "@apple/app-store-server-library";
import { accountToken } from "../../../../shared/shop/app-store";
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
    const ctx = await createUserContext(db, "local", true);
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
      amount: null,
      currency: null,
      coins: 1000,
    });
  });

  test("公開環境では商品IDだけで有償ptを付与しない", async () => {
    const ctx = await createUserContext(db, "x");
    const product = await createCoinProduct(db);
    await expect(handler({ input: { productId: product.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(0);
  });
});

test("StoreKit の購入を本人に一度だけ付与し、未検証の取引は本番で拒否する", async () => {
  const ctx = await createUserContext(db, "local", true);
  const other = await createUserContext(db, "other", true);
  const product = await createCoinProduct(db, 500);
  const claims = {
    bundleId: "com.matsupiee.wikicollection",
    productId: product.sku,
    environment: "Xcode",
    appAccountToken: await accountToken(ctx.session.user.id),
    transactionId: "123",
    quantity: 1,
    type: "Consumable",
    price: 5000,
    currency: "USD",
  };
  const receipt = (extra = {}) => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    return encode({ alg: "ES256" }) + "." + encode({ ...claims, ...extra }) + ".AA";
  };
  const input = { receipt: receipt() };
  for (const environment of ["Production", "Sandbox", "Xcode", "LocalTesting", "other"]) {
    await expect(
      handler({
        ctx: { ...ctx, localDevelopment: false },
        input: { receipt: receipt({ environment }) },
      }),
    ).rejects.toThrow();
  }
  await expect(handler({ ctx: other, input })).rejects.toThrow();
  for (const extra of [
    { revocationDate: 1 },
    { quantity: 2 },
    { type: "Non-Consumable" },
    { bundleId: "wrong" },
    { productId: "unknown" },
  ]) {
    await expect(handler({ ctx, input: { receipt: receipt(extra) } })).rejects.toThrow();
  }
  expect((await getCoinBalance(db, ctx.session.user.id)).paid).toBe(0);
  await Promise.all([handler({ ctx, input }), handler({ ctx, input })]);
  expect((await getCoinBalance(db, ctx.session.user.id)).paid).toBe(500);
  for (const [id, price, currency, expectedAmount, expectedCurrency] of [
    ["123", 5000, "USD", 500, "USD"],
    ["yen", 500000, "JPY", 500, "JPY"],
    ["zero", 0, "JPY", 0, "JPY"],
    ["no-price", undefined, "JPY", null, null],
    ["no-currency", 5000, undefined, null, null],
  ] as const) {
    await handler({ ctx, input: { receipt: receipt({ transactionId: id, price, currency }) } });
    const [purchase] = await db
      .select()
      .from(coinPurchase)
      .where(eq(coinPurchase.providerPaymentId, `Xcode/${id}`));
    expect(purchase).toMatchObject({
      amount: expectedAmount,
      currency: expectedCurrency,
      coins: 500,
    });
  }
});

test("同じIDのSandbox購入と本番購入を区別し、同じ残高へ各1回付与する", async () => {
  const ctx = await createUserContext(db);
  const product = await createCoinProduct(db, 1000);
  const token = await accountToken(ctx.session.user.id);
  const receipts = [Environment.SANDBOX, Environment.PRODUCTION].map((environment) => {
    const payload = Buffer.from(JSON.stringify({ environment })).toString("base64url");
    return { receipt: `header.${payload}.signature`, environment };
  });
  // Signature verification is covered with signed fixtures in app-store.test.ts.
  const verification = spyOn(
    SignedDataVerifier.prototype,
    "verifyAndDecodeTransaction",
  ).mockImplementation(async (receipt) => ({
    environment: receipts.find((entry) => entry.receipt === receipt)!.environment,
    transactionId: "same-id",
    productId: product.sku,
    appAccountToken: token,
    type: "Consumable",
    quantity: 1,
  }));
  try {
    for (const { receipt } of receipts) {
      await Promise.all([
        handler({ ctx, input: { receipt } }),
        handler({ ctx, input: { receipt } }),
      ]);
    }
    expect(await getCoinBalance(db, ctx.session.user.id)).toEqual({
      total: 2000,
      paid: 2000,
      free: 0,
    });
    const records = await db
      .select()
      .from(coinPurchase)
      .where(eq(coinPurchase.userId, ctx.session.user.id));
    expect(records.map((record) => record.providerPaymentId).sort()).toEqual([
      "Production/same-id",
      "Sandbox/same-id",
    ]);
  } finally {
    verification.mockRestore();
  }
});
