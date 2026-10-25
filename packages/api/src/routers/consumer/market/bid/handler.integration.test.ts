import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { auctionBid, marketListing } from "@wiki-collection/db/schema/index";
import { asc, eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { createTestDb } from "../../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createUserContext,
  giveCard,
  grantCoins,
} from "../../../../test/fixtures";
import { handler as createListingHandler } from "../create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

async function setupAuction(startPrice = 100) {
  const seller = await createUserContext(db, "出品者");
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "legendary" });
  const owned = await giveCard(db, seller.session.user.id, c.id);
  const { listingId } = await createListingHandler({
    input: { format: "auction", userCardId: owned.id, startPrice, durationHours: 24 },
    ctx: seller,
  });
  return { seller, listingId };
}

describe("market/bid", () => {
  test("入札額はその場で消費され、抜かれたら同じ有償・無償の内訳で戻る", async () => {
    const { listingId } = await setupAuction(100);
    const alice = await createUserContext(db, "alice");
    const bob = await createUserContext(db, "bob");
    await grantCoins(db, alice.session.user.id, 80, true);
    await grantCoins(db, alice.session.user.id, 50, false);
    await grantCoins(db, bob.session.user.id, 500, true);

    await handler({ input: { listingId, amount: 100 }, ctx: alice });
    expect(await getCoinBalance(db, alice.session.user.id)).toEqual({
      total: 30,
      paid: 30,
      free: 0,
    });

    // 次の最低額は 100 + 5% = 105
    await expect(handler({ input: { listingId, amount: 104 }, ctx: bob })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await handler({ input: { listingId, amount: 105 }, ctx: bob });

    expect(await getCoinBalance(db, alice.session.user.id)).toEqual({
      total: 130,
      paid: 80,
      free: 50,
    });
    expect(await getCoinBalance(db, bob.session.user.id)).toEqual({
      total: 395,
      paid: 395,
      free: 0,
    });
    const bids = await db
      .select()
      .from(auctionBid)
      .where(eq(auctionBid.listingId, listingId))
      .orderBy(asc(auctionBid.sequence));
    expect(bids.map((b) => [b.sequence, b.status])).toEqual([
      [1, "outbid"],
      [2, "leading"],
    ]);
    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing).toMatchObject({ currentPrice: 105, bidCount: 2 });
  });

  test("出品者・最高額の入札者・pt が足りない人・終了後は入札できない", async () => {
    const { seller, listingId } = await setupAuction(100);
    const alice = await createUserContext(db);
    const poor = await createUserContext(db);
    await grantCoins(db, seller.session.user.id, 1000);
    await grantCoins(db, alice.session.user.id, 1000);
    await grantCoins(db, poor.session.user.id, 50);

    await expect(handler({ input: { listingId, amount: 100 }, ctx: seller })).rejects.toMatchObject(
      {
        code: "PRECONDITION_FAILED",
      },
    );
    await handler({ input: { listingId, amount: 100 }, ctx: alice });
    await expect(handler({ input: { listingId, amount: 200 }, ctx: alice })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    await expect(handler({ input: { listingId, amount: 200 }, ctx: poor })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    setSystemTime(new Date(Date.now() + 25 * 60 * 60 * 1000));
    const late = await createUserContext(db);
    await grantCoins(db, late.session.user.id, 1000);
    await expect(handler({ input: { listingId, amount: 500 }, ctx: late })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  test("同時に入札されても、成立するのは1件だけで pt は二重に消費されない", async () => {
    const { listingId } = await setupAuction(100);
    const a = await createUserContext(db);
    const b = await createUserContext(db);
    await grantCoins(db, a.session.user.id, 200);
    await grantCoins(db, b.session.user.id, 200);

    const results = await Promise.allSettled([
      handler({ input: { listingId, amount: 100 }, ctx: a }),
      handler({ input: { listingId, amount: 100 }, ctx: b }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const totals = [
      (await getCoinBalance(db, a.session.user.id)).total,
      (await getCoinBalance(db, b.session.user.id)).total,
    ].sort((x, y) => x - y);
    expect(totals).toEqual([100, 200]);
  });
});
