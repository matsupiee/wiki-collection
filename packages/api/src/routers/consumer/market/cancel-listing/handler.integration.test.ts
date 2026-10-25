import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { createTestDb } from "../../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createUserContext,
  giveCard,
  grantCoins,
} from "../../../../test/fixtures";
import { handler as bidHandler } from "../bid/handler";
import { handler as createListingHandler } from "../create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("market/cancel-listing", () => {
  test("取り下げるとカードは所持中に戻る", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);
    const { listingId } = await createListingHandler({
      input: { format: "fixed_price", userCardId: owned.id, price: 90 },
      ctx,
    });

    await handler({ input: { listingId }, ctx });

    const [after] = await db.select().from(userCard).where(eq(userCard.id, owned.id));
    expect(after?.status).toBe("owned");
  });

  test("他人の出品と、入札が入ったオークションは取り下げられない", async () => {
    const seller = await createUserContext(db);
    const bidder = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, seller.session.user.id, c.id);
    const { listingId } = await createListingHandler({
      input: { format: "auction", userCardId: owned.id, startPrice: 10, durationHours: 24 },
      ctx: seller,
    });
    await expect(handler({ input: { listingId }, ctx: bidder })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    await grantCoins(db, bidder.session.user.id, 100);
    await bidHandler({ input: { listingId, amount: 10 }, ctx: bidder });
    await expect(handler({ input: { listingId }, ctx: seller })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
