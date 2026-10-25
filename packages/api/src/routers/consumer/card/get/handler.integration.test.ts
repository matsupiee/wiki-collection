import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { cardDiscovery } from "@wiki-collection/db/schema/index";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler as createListingHandler } from "../../market/create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/get", () => {
  test("カードの情報、出典 URL、所持中のカード、還元 pt、マーケットの最安値を返す", async () => {
    const ctx = await createUserContext(db);
    const seller = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "double_rare" });
    const mine = await giveCard(db, ctx.session.user.id, c.id);
    await db
      .insert(cardDiscovery)
      .values({ userId: ctx.session.user.id, cardId: c.id, firstAcquiredAt: new Date() });
    for (const price of [120, 80]) {
      const copy = await giveCard(db, seller.session.user.id, c.id);
      await createListingHandler({
        input: { format: "fixed_price", userCardId: copy.id, price },
        ctx: seller,
      });
    }

    const result = await handler({ input: { cardId: c.id }, ctx });

    expect(result.card.wikiUrl).toBe(
      `https://ja.wikipedia.org/wiki/${encodeURIComponent(c.title)}`,
    );
    expect(result.ownedUserCardIds).toEqual([mine.id]);
    expect(result.redeemPoints).toBe(60);
    expect(result.lowestMarketPrice).toBe(80);
  });

  test("手に入れたことのないカードは見られない", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "common" });
    await expect(handler({ input: { cardId: c.id }, ctx })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
