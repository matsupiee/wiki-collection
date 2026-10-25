import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createPack,
  createUserContext,
  grantCoins,
} from "../../../../test/fixtures";
import { handler as openPackHandler } from "../../pack/open/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("coin/list-history", () => {
  test("獲得と消費を新しい順に並べ、消費には有償・無償の内訳を付ける", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { type: "premium", genreId: g.id, priceCoins: 150 });
    await grantCoins(db, userId, 1000, true);
    await grantCoins(db, userId, 100, false);
    await new Promise((r) => setTimeout(r, 5));
    await openPackHandler({ input: { packId: p.id }, ctx });

    const { entries } = await handler({ ctx });

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      kind: "withdraw",
      purpose: "pack_open",
      amount: 150,
      paidAmount: 50,
      freeAmount: 100,
    });
  });
});
