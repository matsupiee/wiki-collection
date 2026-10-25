import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { marketListing, userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
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

describe("market/list", () => {
  test("形式ごとに出品中のものを返し、カード名と価格順で絞り込める", async () => {
    const seller = await createUserContext(db, "出品者");
    const viewer = await createUserContext(db);
    const g = await createGenre(db);
    const blackHole = await createCard(db, {
      genreId: g.id,
      rarity: "rare",
      title: "ブラックホール",
    });
    const moon = await createCard(db, { genreId: g.id, rarity: "common", title: "月" });
    for (const [cardId, price] of [
      [blackHole.id, 300],
      [moon.id, 20],
      [blackHole.id, 120],
    ] as const) {
      const copy = await giveCard(db, seller.session.user.id, cardId);
      await createListingHandler({
        input: { format: "fixed_price", userCardId: copy.id, price },
        ctx: seller,
      });
    }

    const all = await handler({ input: { format: "fixed_price", sort: "price_asc" }, ctx: viewer });
    expect(all.listings.map((l) => l.price)).toEqual([20, 120, 300]);
    expect(all.listings[0]).toMatchObject({ sellerName: "出品者", isMine: false });

    const searched = await handler({
      input: { format: "fixed_price", query: "ブラック", sort: "price_asc" },
      ctx: viewer,
    });
    expect(searched.listings.map((l) => l.price)).toEqual([120, 300]);

    const auctions = await handler({ input: { format: "auction" }, ctx: viewer });
    expect(auctions.listings).toHaveLength(0);
  });

  test("終了したオークションを締める。入札があれば落札者にカードが移り、出品者に売上が入る", async () => {
    setSystemTime(new Date("2026-10-25T00:00:00Z"));
    const seller = await createUserContext(db);
    const bidder = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "legendary" });
    const sold = await giveCard(db, seller.session.user.id, c.id);
    const unsold = await giveCard(db, seller.session.user.id, c.id);
    const soldListing = await createListingHandler({
      input: { format: "auction", userCardId: sold.id, startPrice: 200, durationHours: 24 },
      ctx: seller,
    });
    const unsoldListing = await createListingHandler({
      input: { format: "auction", userCardId: unsold.id, startPrice: 200, durationHours: 24 },
      ctx: seller,
    });
    await grantCoins(db, bidder.session.user.id, 500);
    await bidHandler({ input: { listingId: soldListing.listingId, amount: 200 }, ctx: bidder });

    setSystemTime(new Date("2026-10-26T00:00:01Z"));
    const result = await handler({ input: { format: "auction" }, ctx: bidder });
    expect(result.listings).toHaveLength(0);

    const [soldAfter] = await db
      .select()
      .from(marketListing)
      .where(eq(marketListing.id, soldListing.listingId));
    expect(soldAfter).toMatchObject({
      status: "sold",
      buyerId: bidder.session.user.id,
      soldPrice: 200,
      feeAmount: 20,
    });
    const [unsoldAfter] = await db
      .select()
      .from(marketListing)
      .where(eq(marketListing.id, unsoldListing.listingId));
    expect(unsoldAfter?.status).toBe("expired");
    const [soldCard] = await db.select().from(userCard).where(eq(userCard.id, sold.id));
    expect(soldCard).toMatchObject({ userId: bidder.session.user.id, status: "owned" });
    const [unsoldCard] = await db.select().from(userCard).where(eq(userCard.id, unsold.id));
    expect(unsoldCard).toMatchObject({ userId: seller.session.user.id, status: "owned" });
    expect((await getCoinBalance(db, seller.session.user.id)).total).toBe(180);
    expect((await getCoinBalance(db, bidder.session.user.id)).total).toBe(300);

    // 2回締めても売上は二重に入らない
    await handler({ input: { format: "auction" }, ctx: bidder });
    expect((await getCoinBalance(db, seller.session.user.id)).total).toBe(180);
  });
});
