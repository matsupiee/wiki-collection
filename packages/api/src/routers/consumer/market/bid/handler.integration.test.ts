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

    // 次の最低額は 100 + 10 = 110
    await expect(handler({ input: { listingId, amount: 109 }, ctx: bob })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await handler({ input: { listingId, amount: 110 }, ctx: bob });

    expect(await getCoinBalance(db, alice.session.user.id)).toEqual({
      total: 130,
      paid: 80,
      free: 50,
    });
    expect(await getCoinBalance(db, bob.session.user.id)).toEqual({
      total: 390,
      paid: 390,
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
    expect(listing).toMatchObject({ currentPrice: 110, bidCount: 2 });
  });

  test("延長の境界と再延長、残高不足、締切時刻", async () => {
    const start = new Date("2026-11-14T00:00:00Z").getTime();
    setSystemTime(new Date(start));
    const { listingId } = await setupAuction();
    const end = start + 24 * 3_600_000;
    const a = await createUserContext(db);
    const b = await createUserContext(db);
    await grantCoins(db, a.session.user.id, 200);
    const deadline = async () => {
      const [row] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
      return row!.endsAt!.getTime();
    };
    setSystemTime(new Date(end - 10_001));
    await handler({ input: { listingId, amount: 100 }, ctx: a });
    expect(await deadline()).toBe(end);
    setSystemTime(new Date(end - 10_000));
    await expect(handler({ input: { listingId, amount: 110 }, ctx: b })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(await deadline()).toBe(end);
    await grantCoins(db, b.session.user.id, 200);
    await handler({ input: { listingId, amount: 110 }, ctx: b });
    expect(await deadline()).toBe(end + 50_000);
    setSystemTime(new Date(end + 49_999));
    await handler({ input: { listingId, amount: 120 }, ctx: a });
    expect(await deadline()).toBe(end + 109_999);
    setSystemTime(new Date(end + 109_999));
    await expect(handler({ input: { listingId, amount: 130 }, ctx: b })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  test.each([
    [10, 20],
    [990, 1000],
    [991, 1001],
    [999, 1009],
    [1000, 1100],
    [4999, 5099],
    [5000, 5250],
    [9999, 10249],
    [10000, 10500],
    [49999, 50499],
    [50000, 51000],
    [75000, 76000],
  ])("現在価格%iなら次の最低入札額は%i", async (price, minimum) => {
    const { listingId } = await setupAuction(10);
    const first = await createUserContext(db);
    const next = await createUserContext(db);
    await grantCoins(db, first.session.user.id, price);
    await grantCoins(db, next.session.user.id, minimum);
    await handler({ input: { listingId, amount: price }, ctx: first });
    await expect(
      handler({ input: { listingId, amount: minimum - 1 }, ctx: next }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await handler({ input: { listingId, amount: minimum }, ctx: next })).toEqual({
      currentPrice: minimum,
    });
  });

  test("旧仕様で開始価格が10pt未満の出品も初回入札は10ptから", async () => {
    const { listingId } = await setupAuction(1);
    const first = await createUserContext(db);
    await grantCoins(db, first.session.user.id, 10);
    await expect(handler({ input: { listingId, amount: 9 }, ctx: first })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(await handler({ input: { listingId, amount: 10 }, ctx: first })).toEqual({
      currentPrice: 10,
    });
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

    expect((await getCoinBalance(db, poor.session.user.id)).total).toBe(50);
    const remainingBids = await db
      .select()
      .from(auctionBid)
      .where(eq(auctionBid.listingId, listingId));
    expect(remainingBids).toHaveLength(1);
    expect(remainingBids[0]).toMatchObject({ bidderId: alice.session.user.id, status: "leading" });

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
