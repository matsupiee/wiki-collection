import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import {
  coinDeposit,
  marketListing,
  packOpeningCard,
  userCard,
  userCardOwnershipTransfers,
} from "@wiki-collection/db/schema/index";
import { and, eq, sql } from "drizzle-orm";
import { createTestDb } from "./create-test-db";
import { createCard, createGenre, createPack, createUserContext, grantCoins } from "./fixtures";
import { handler as open } from "../routers/consumer/pack/open/handler";
import { handler as getOpening } from "../routers/consumer/opening/get/handler";
import { handler as getCard } from "../routers/consumer/card/get/handler";
import { handler as listOwned } from "../routers/consumer/card/list-owned/handler";
import { handler as createListing } from "../routers/consumer/market/create-listing/handler";
import { handler as bid } from "../routers/consumer/market/bid/handler";
import { settleEndedAuctions } from "../shared/market/settle-ended-auctions";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

async function setup() {
  const seller = await createUserContext(db);
  const buyer = await createUserContext(db);
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "common" });
  const p = await createPack(db, { genreId: g.id });
  const opened = await open({ ctx: seller, input: { packId: p.id } });
  const result = await getOpening({ ctx: seller, input: { openingId: opened.openingId } });
  const copyId = result.cards[0]!.userCardId;
  const listing = await createListing({
    ctx: seller,
    input: { userCardId: copyId, format: "auction", startPrice: 10, durationHours: 24 },
  });
  await grantCoins(db, buyer.session.user.id, 100);
  await bid({ ctx: buyer, input: { listingId: listing.listingId, amount: 10 } });
  return { seller, buyer, c, p, opened, result, copyId, listingId: listing.listingId };
}

test("売買後も開封結果は不変で、旧所有者と新所有者の獲得履歴を保持する", async () => {
  const f = await setup();
  const now = new Date(Date.now() + 25 * 3600_000);
  await Promise.all([
    settleEndedAuctions(db, now, { listingId: f.listingId }),
    settleEndedAuctions(db, now, { listingId: f.listingId }),
  ]);
  expect(await getOpening({ ctx: f.seller, input: { openingId: f.opened.openingId } })).toEqual(
    f.result,
  );
  const [copy] = await db.select().from(userCard).where(eq(userCard.id, f.copyId));
  expect(copy?.ownerId).toBe(f.buyer.session.user.id);
  const transfers = await db
    .select()
    .from(userCardOwnershipTransfers)
    .where(eq(userCardOwnershipTransfers.userCardId, f.copyId));
  expect(transfers).toHaveLength(2);
  expect(transfers.find((t) => t.reason === "pack_open")).toMatchObject({
    fromUserId: null,
    toUserId: f.seller.session.user.id,
  });
  expect(transfers.find((t) => t.reason === "market_sale")).toMatchObject({
    fromUserId: f.seller.session.user.id,
    toUserId: f.buyer.session.user.id,
    marketListingId: f.listingId,
  });
  expect(
    await db.select().from(coinDeposit).where(eq(coinDeposit.marketListingId, f.listingId)),
  ).toHaveLength(1);
  for (const ctx of [f.seller, f.buyer])
    expect((await getCard({ ctx, input: { cardId: f.c.id } })).discovered).toBe(true);
  const stranger = await createUserContext(db);
  await expect(
    getOpening({ ctx: stranger, input: { openingId: f.opened.openingId } }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(getCard({ ctx: stranger, input: { cardId: f.c.id } })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await listOwned({ ctx: f.buyer, input: {} })).cards[0]?.ownedCount).toBeDefined();
  // 購入後の初開封でも、すでに取得した種類にはNEWを付けない。
  expect((await open({ ctx: f.buyer, input: { packId: f.p.id } })).newUserCardIds).toEqual([]);
  const results = await db
    .select()
    .from(packOpeningCard)
    .where(eq(packOpeningCard.packOpeningId, f.opened.openingId));
  expect(results.map((r) => r.slot).sort()).toEqual([1, 2, 3, 4, 5]);
});

test("売上保存が失敗したときは所有者・移転履歴・出品状態も戻り、再試行できる", async () => {
  const f = await setup();
  await db.run(sql`CREATE TRIGGER fail_history_sale BEFORE INSERT ON coin_deposit
    WHEN NEW.source = 'market_sale' BEGIN SELECT RAISE(ABORT, 'test sale failure'); END`);
  const now = new Date(Date.now() + 25 * 3600_000);
  try {
    await expect(settleEndedAuctions(db, now, { listingId: f.listingId })).rejects.toThrow();
    const [copy] = await db.select().from(userCard).where(eq(userCard.id, f.copyId));
    expect(copy).toMatchObject({ ownerId: f.seller.session.user.id, status: "listed" });
    const [listing] = await db
      .select()
      .from(marketListing)
      .where(eq(marketListing.id, f.listingId));
    expect(listing?.status).toBe("active");
    expect(
      await db
        .select()
        .from(userCardOwnershipTransfers)
        .where(
          and(
            eq(userCardOwnershipTransfers.userCardId, f.copyId),
            eq(userCardOwnershipTransfers.reason, "market_sale"),
          ),
        ),
    ).toHaveLength(0);
  } finally {
    await db.run(sql`DROP TRIGGER fail_history_sale`);
  }
  await settleEndedAuctions(db, now, { listingId: f.listingId });
  const [copy] = await db.select().from(userCard).where(eq(userCard.id, f.copyId));
  expect(copy?.ownerId).toBe(f.buyer.session.user.id);
});

test("seedと旧reasonはpack_openに統一し、移転相手・日時・売買履歴を変えない", async () => {
  const { recordSeedGrants } = await import("@wiki-collection/db/seed/record-seed-grants");
  const { normalizeOwnershipReasons, countOldOwnershipReasons } =
    await import("@wiki-collection/db/seed/normalize-ownership-reasons");
  const ctx = await createUserContext(db);
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "common" });
  const [copy] = await db
    .insert(userCard)
    .values({ ownerId: ctx.session.user.id, cardId: c.id })
    .returning();
  await recordSeedGrants(db);
  await recordSeedGrants(db);
  const seeded = await db
    .select()
    .from(userCardOwnershipTransfers)
    .where(eq(userCardOwnershipTransfers.userCardId, copy!.id));
  expect(seeded).toHaveLength(1);
  expect(seeded[0]?.reason).toBe("pack_open");
  // 旧値は現在の型では作れないため、移行前データをSQLで再現する。
  await db.run(sql`INSERT INTO user_card_ownership_transfers (id, card_id, to_user_id, reason, created_at)
    VALUES ('old-admin-reason', ${c.id}, ${ctx.session.user.id}, 'admin_grant', 1000),
           ('old-legacy-reason', ${c.id}, ${ctx.session.user.id}, 'legacy_acquisition', 2000)`);
  await db.run(sql`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<105)
    INSERT INTO user_card_ownership_transfers (id, card_id, to_user_id, reason, created_at)
    SELECT 'old-batch-' || n, ${c.id}, ${ctx.session.user.id}, 'legacy_acquisition', n FROM numbers`);
  const before = await db.select().from(userCardOwnershipTransfers);
  expect(await countOldOwnershipReasons(db)).toBe(107);
  expect(await normalizeOwnershipReasons(db)).toBe(107);
  expect(await countOldOwnershipReasons(db)).toBe(0);
  expect(await normalizeOwnershipReasons(db)).toBe(0);
  const after = await db.select().from(userCardOwnershipTransfers);
  expect(after).toEqual(
    before.map((row) => ({ ...row, reason: row.id.startsWith("old-") ? "pack_open" : row.reason })),
  );
});
