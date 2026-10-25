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
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("pack/get", () => {
  test("枠ごとの排出率を % で返し、注目カードを重みの大きい順に返す", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const a = await createCard(db, { genreId: g.id, rarity: "rare", title: "A" });
    const b = await createCard(db, { genreId: g.id, rarity: "legendary", title: "B" });
    const p = await createPack(db, {
      type: "premium",
      priceCoins: 150,
      rates: [
        { slot: 5, rarity: "legendary", weight: 25 },
        { slot: 5, rarity: "rare", weight: 75 },
      ],
      featured: [
        { cardId: a.id, weight: 2 },
        { cardId: b.id, weight: 5 },
      ],
    });

    const result = await handler({ input: { slug: p.slug }, ctx });

    expect(result.slotRates).toHaveLength(5);
    expect(result.slotRates[4]).toEqual({
      slot: 5,
      rates: [
        { rarity: "rare", percent: 75 },
        { rarity: "legendary", percent: 25 },
      ],
    });
    expect(result.featuredCards.map((c) => c.title)).toEqual(["B", "A"]);
  });

  test("有料パックは pt が足りないと開封できない", async () => {
    const ctx = await createUserContext(db);
    const p = await createPack(db, { type: "premium", priceCoins: 150 });
    await grantCoins(db, ctx.session.user.id, 149);

    expect(await handler({ input: { slug: p.slug }, ctx })).toMatchObject({
      canOpen: false,
      blockedReason: "insufficient_coins",
      balance: 149,
    });

    await grantCoins(db, ctx.session.user.id, 1);
    expect(await handler({ input: { slug: p.slug }, ctx })).toMatchObject({
      canOpen: true,
      blockedReason: null,
    });
  });

  test("存在しないパックは NOT_FOUND", async () => {
    const ctx = await createUserContext(db);
    await expect(handler({ input: { slug: "nothing" }, ctx })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
