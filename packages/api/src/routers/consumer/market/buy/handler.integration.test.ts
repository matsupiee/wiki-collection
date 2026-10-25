import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { cardDiscovery, marketListing, userCard } from "@wiki-collection/db/schema/index";
import { and, eq } from "drizzle-orm";

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

async function setupListing(price: number) {
  const seller = await createUserContext(db, "出品者");
  const buyer = await createUserContext(db, "購入者");
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "double_rare" });
  const owned = await giveCard(db, seller.session.user.id, c.id);
  const { listingId } = await createListingHandler({
    input: { format: "fixed_price", userCardId: owned.id, price },
    ctx: seller,
  });
  return { seller, buyer, card: c, userCardId: owned.id, listingId };
}

describe("market/buy", () => {
  test("購入すると、買い手の pt が減り、出品者に手数料を引いた無償 pt が入り、カードが買い手に移る", async () => {
    const { seller, buyer, card: c, userCardId, listingId } = await setupListing(100);
    await grantCoins(db, buyer.session.user.id, 300, true);

    expect(await handler({ input: { listingId }, ctx: buyer })).toEqual({
      cardId: c.id,
      price: 100,
    });

    expect(await getCoinBalance(db, buyer.session.user.id)).toEqual({
      total: 200,
      paid: 200,
      free: 0,
    });
    expect(await getCoinBalance(db, seller.session.user.id)).toEqual({
      total: 90,
      paid: 0,
      free: 90,
    });
    const [moved] = await db.select().from(userCard).where(eq(userCard.id, userCardId));
    expect(moved).toMatchObject({ userId: buyer.session.user.id, status: "owned" });
    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing).toMatchObject({
      status: "sold",
      buyerId: buyer.session.user.id,
      soldPrice: 100,
      feeAmount: 10,
    });
    const discoveries = await db
      .select()
      .from(cardDiscovery)
      .where(and(eq(cardDiscovery.userId, buyer.session.user.id), eq(cardDiscovery.cardId, c.id)));
    expect(discoveries).toHaveLength(1);
  });

  test("pt が足りないと購入できず、出品はそのまま残る", async () => {
    const { buyer, listingId } = await setupListing(100);
    await grantCoins(db, buyer.session.user.id, 99);
    await expect(handler({ input: { listingId }, ctx: buyer })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing?.status).toBe("active");
  });

  test("自分の出品は買えない。売れた出品は2人目が買えない", async () => {
    const { seller, buyer, listingId } = await setupListing(50);
    await grantCoins(db, seller.session.user.id, 100);
    await expect(handler({ input: { listingId }, ctx: seller })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const second = await createUserContext(db);
    await grantCoins(db, buyer.session.user.id, 100);
    await grantCoins(db, second.session.user.id, 100);
    const results = await Promise.allSettled([
      handler({ input: { listingId }, ctx: buyer }),
      handler({ input: { listingId }, ctx: second }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const totals = [
      (await getCoinBalance(db, buyer.session.user.id)).total,
      (await getCoinBalance(db, second.session.user.id)).total,
    ].sort((x, y) => x - y);
    expect(totals).toEqual([50, 100]);
  });
});
