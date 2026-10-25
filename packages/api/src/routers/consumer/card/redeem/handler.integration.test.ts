import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { coinDeposit, userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler as createListingHandler } from "../../market/create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/redeem", () => {
  test("レアリティに応じた無償 pt を受け取り、カードは還元済みになる", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "legendary" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);

    expect(await handler({ input: { userCardId: owned.id }, ctx })).toEqual({ points: 300 });

    const [after] = await db.select().from(userCard).where(eq(userCard.id, owned.id));
    expect(after?.status).toBe("redeemed");
    expect(await getCoinBalance(db, ctx.session.user.id)).toEqual({
      total: 300,
      paid: 0,
      free: 300,
    });
    const [deposit] = await db
      .select()
      .from(coinDeposit)
      .where(eq(coinDeposit.userCardId, owned.id));
    expect(deposit).toMatchObject({ source: "card_redeem", isPaid: false });
  });

  test("還元済み・出品中・他人のカードは還元できない", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "common" });
    const redeemed = await giveCard(db, ctx.session.user.id, c.id);
    await handler({ input: { userCardId: redeemed.id }, ctx });
    const listed = await giveCard(db, ctx.session.user.id, c.id);
    await createListingHandler({
      input: { format: "fixed_price", userCardId: listed.id, price: 5 },
      ctx,
    });
    const others = await giveCard(db, other.session.user.id, c.id);

    for (const userCardId of [redeemed.id, listed.id, others.id]) {
      await expect(handler({ input: { userCardId }, ctx })).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
      });
    }
    expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(1);
  });
});
