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
import { handler as createListingHandler } from "../create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("market/get", () => {
  test("オークションの入札履歴、次の最低額、自分が最高額かを返す", async () => {
    const seller = await createUserContext(db, "出品者");
    const alice = await createUserContext(db, "alice");
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, seller.session.user.id, c.id);
    const { listingId } = await createListingHandler({
      input: { format: "auction", userCardId: owned.id, startPrice: 100, durationHours: 24 },
      ctx: seller,
    });
    await grantCoins(db, alice.session.user.id, 1000);
    await bidHandler({ input: { listingId, amount: 100 }, ctx: alice });

    const forAlice = await handler({ input: { listingId }, ctx: alice });
    expect(forAlice).toMatchObject({ minNextBid: 105, isLeading: true, balance: 900 });
    expect(forAlice.bids).toEqual([
      expect.objectContaining({ amount: 100, bidderName: "alice", isMine: true }),
    ]);

    const forSeller = await handler({ input: { listingId }, ctx: seller });
    expect(forSeller.listing).toMatchObject({
      isMine: true,
      sellerName: "出品者",
      currentPrice: 100,
    });
    expect(forSeller.isLeading).toBe(false);
  });

  test("存在しない出品は NOT_FOUND", async () => {
    const ctx = await createUserContext(db);
    await expect(handler({ input: { listingId: "none" }, ctx })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
