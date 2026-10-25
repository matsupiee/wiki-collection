import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import {
  cardDiscovery,
  coinWithdraw,
  packOpening,
  userCard,
} from "@wiki-collection/db/schema/index";
import { and, asc, eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { getFreePackStatus } from "../../../../shared/pack/get-free-pack-status";
import { createTestDb } from "../../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createPack,
  createUserContext,
  grantCoins,
} from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("pack/open", () => {
  test("5枚を抽選して保存し、レアリティの低い順に並べる。初めてのカードは NEW になる", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const common = await createCard(db, { genreId: g.id, rarity: "common" });
    const legendary = await createCard(db, { genreId: g.id, rarity: "legendary" });
    const p = await createPack(db, {
      genreId: g.id,
      rates: [
        { slot: 1, rarity: "legendary", weight: 1 },
        ...[2, 3, 4, 5].map((slot) => ({ slot, rarity: "common" as const, weight: 1 })),
      ],
    });

    const { openingId } = await handler({ input: { packId: p.id }, ctx });

    const cards = await db
      .select()
      .from(userCard)
      .where(eq(userCard.packOpeningId, openingId))
      .orderBy(asc(userCard.slot));
    expect(cards.map((c) => c.cardId)).toEqual([
      common.id,
      common.id,
      common.id,
      common.id,
      legendary.id,
    ]);
    // 同じパックの2枚目以降のコモンは NEW にしない
    expect(cards.map((c) => c.isNewOnAcquire)).toEqual([true, false, false, false, true]);
    const discoveries = await db
      .select()
      .from(cardDiscovery)
      .where(eq(cardDiscovery.userId, ctx.session.user.id));
    expect(discoveries).toHaveLength(2);

    const second = await handler({ input: { packId: p.id }, ctx });
    const secondCards = await db
      .select()
      .from(userCard)
      .where(eq(userCard.packOpeningId, second.openingId));
    expect(secondCards.every((c) => !c.isNewOnAcquire)).toBe(true);
  });

  test("注目カードは重みの分だけ出やすい", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const featured = await createCard(db, { genreId: g.id, rarity: "common" });
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, {
      genreId: g.id,
      featured: [{ cardId: featured.id, weight: 1000 }],
    });
    // random を 0.5 に固定すると、重み 1000 : 1 の候補からは注目カードが選ばれる
    const { openingId } = await handler({ input: { packId: p.id }, ctx, random: () => 0.5 });
    const cards = await db.select().from(userCard).where(eq(userCard.packOpeningId, openingId));
    expect(cards.every((c) => c.cardId === featured.id)).toBe(true);
  });

  test("ジャンルパックは指定ジャンルのカードだけが出る。排出停止のカードは出ない", async () => {
    const ctx = await createUserContext(db);
    const space = await createGenre(db, "宇宙");
    const history = await createGenre(db, "歴史");
    const spaceCard = await createCard(db, { genreId: space.id, rarity: "common" });
    await createCard(db, { genreId: space.id, rarity: "common", isActive: false });
    await createCard(db, { genreId: history.id, rarity: "common" });
    const p = await createPack(db, { genreId: space.id });
    const { openingId } = await handler({ input: { packId: p.id }, ctx });
    const cards = await db.select().from(userCard).where(eq(userCard.packOpeningId, openingId));
    expect(new Set(cards.map((c) => c.cardId))).toEqual(new Set([spaceCard.id]));
  });

  test("無料パックは登録時の 20 と毎日の 10 を開けられ、毎日の枠は持ち越せない", async () => {
    setSystemTime(new Date("2026-10-25T03:00:00Z")); // 日本時間 12:00
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });

    for (let i = 0; i < 30; i++) await handler({ input: { packId: p.id }, ctx });
    const opened = await db.select().from(packOpening).where(eq(packOpening.userId, userId));
    expect(opened.filter((o) => o.payment === "free_daily")).toHaveLength(10);
    expect(opened.filter((o) => o.payment === "free_initial")).toHaveLength(20);
    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    // 3日後でも、使えるのはその日の 10 パックだけ
    setSystemTime(new Date("2026-10-28T03:00:00Z"));
    expect((await getFreePackStatus(db, userId, new Date())).remaining).toBe(10);
    for (let i = 0; i < 10; i++) await handler({ input: { packId: p.id }, ctx });
    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  test("毎日の枠を先に使い、初回の枠は翌日以降に残る", async () => {
    setSystemTime(new Date("2026-10-25T03:00:00Z"));
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    for (let i = 0; i < 12; i++) await handler({ input: { packId: p.id }, ctx });
    expect(await getFreePackStatus(db, ctx.session.user.id, new Date())).toMatchObject({
      initialRemaining: 18,
      dailyRemaining: 0,
    });
  });

  test("有料パックは価格分の pt を消費し、無償 pt から先に使う", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { type: "premium", genreId: g.id, priceCoins: 150 });
    await grantCoins(db, userId, 1000, true);
    await grantCoins(db, userId, 100, false);

    const { openingId } = await handler({ input: { packId: p.id }, ctx });

    expect(await getCoinBalance(db, userId)).toEqual({ total: 950, paid: 950, free: 0 });
    const [withdraw] = await db
      .select()
      .from(coinWithdraw)
      .where(eq(coinWithdraw.packOpeningId, openingId));
    expect(withdraw).toMatchObject({ purpose: "pack_open", amount: 150, userSequence: 1 });
  });

  test("pt が足りないと開封できず、何も保存されない", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { type: "premium", genreId: g.id, priceCoins: 150 });
    await grantCoins(db, userId, 149);

    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    const openings = await db
      .select()
      .from(packOpening)
      .where(and(eq(packOpening.userId, userId)));
    expect(openings).toHaveLength(0);
  });

  test("同時に有料パックを開けても、残高を超えて消費されない", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { type: "premium", genreId: g.id, priceCoins: 100 });
    await grantCoins(db, userId, 150);

    const results = await Promise.allSettled([
      handler({ input: { packId: p.id }, ctx }),
      handler({ input: { packId: p.id }, ctx }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getCoinBalance(db, userId)).total).toBe(50);
    const openings = await db.select().from(packOpening).where(eq(packOpening.userId, userId));
    expect(openings).toHaveLength(1);
  });
});
