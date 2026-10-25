import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createUserContext, grantCoins } from "../../../../test/fixtures";
import { prepareCoinWithdraw } from "../../../../shared/coin/prepare-coin-withdraw";
import { runBatch } from "../../../../shared/coin/run-batch";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("coin/get-balance", () => {
  test("獲得の合計から消費の割り当てを引いた残高を、有償・無償に分けて返す", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    await grantCoins(db, userId, 1000, true);
    await grantCoins(db, userId, 30, false);
    await grantCoins(db, userId, 20, false);
    expect(await handler({ ctx })).toEqual({ total: 1050, paid: 1000, free: 50 });

    // 無償の古い獲得分から順に割り当て、足りない分を有償から払う
    await runBatch(
      db,
      await prepareCoinWithdraw(db, { userId, amount: 70, purpose: "admin_revoke" }),
    );
    expect(await handler({ ctx })).toEqual({ total: 980, paid: 980, free: 0 });
  });

  test("他人の残高は混ざらない", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    await grantCoins(db, other.session.user.id, 500);
    expect(await handler({ ctx })).toEqual({ total: 0, paid: 0, free: 0 });
  });
});

describe("coin/get-balance（細かい獲得が多いとき）", () => {
  test("1pt の獲得が 120 件あっても、まとめて消費できる", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    for (let i = 0; i < 120; i++) await grantCoins(db, userId, 1);
    await runBatch(
      db,
      await prepareCoinWithdraw(db, { userId, amount: 110, purpose: "admin_revoke" }),
    );
    expect(await handler({ ctx })).toEqual({ total: 10, paid: 0, free: 10 });
  });
});
