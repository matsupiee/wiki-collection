import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createUserContext,
  giveCard,
  grantCoins,
} from "../../../../test/fixtures";
import { handler as bidHandler } from "../bid/handler";
import { handler as buyHandler } from "../buy/handler";
import { handler as createListingHandler } from "../create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("market/list-mine", () => {
  test("自分の出品、入札中のオークション、買ったものを返す", async () => {
    const me = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    await grantCoins(db, me.session.user.id, 1000);
    await grantCoins(db, other.session.user.id, 1000);

    const mine = await giveCard(db, me.session.user.id, c.id);
    const selling = await createListingHandler({
      input: { format: "fixed_price", userCardId: mine.id, price: 70 },
      ctx: me,
    });
    const forSale = await giveCard(db, other.session.user.id, c.id);
    const fixed = await createListingHandler({
      input: { format: "fixed_price", userCardId: forSale.id, price: 40 },
      ctx: other,
    });
    await buyHandler({ input: { listingId: fixed.listingId }, ctx: me });
    const forAuction = await giveCard(db, other.session.user.id, c.id);
    const auction = await createListingHandler({
      input: { format: "auction", userCardId: forAuction.id, startPrice: 30, durationHours: 24 },
      ctx: other,
    });
    await bidHandler({ input: { listingId: auction.listingId, amount: 30 }, ctx: me });

    const result = await handler({ ctx: me });

    expect(result.selling.map((l) => l.id)).toEqual([selling.listingId]);
    expect(result.bought.map((l) => [l.id, l.price])).toEqual([[fixed.listingId, 40]]);
    expect(result.bidding).toEqual([
      expect.objectContaining({ id: auction.listingId, myBid: 30, isLeading: true }),
    ]);
  });
});
