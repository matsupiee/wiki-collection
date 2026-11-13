import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import {
  cardDiscovery,
  freePackAllowance,
  coinWithdraw,
  packOpening,
  userCard,
} from "@wiki-collection/db/schema/index";
import { and, eq } from "drizzle-orm";

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
import { handler as getOpening } from "../../opening/get/handler";
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

    const queued: string[][] = [];
    const { openingId, newUserCardIds } = await handler({
      input: { packId: p.id },
      ctx: { ...ctx, cacheCommonImages: (ids) => queued.push(ids) },
    });
    expect(queued).toEqual([[common.id]]);

    const { cards } = await getOpening({ ctx, input: { openingId } });
    expect(cards.map((c) => c.card.id)).toEqual([
      common.id,
      common.id,
      common.id,
      common.id,
      legendary.id,
    ]);
    expect(cards.map((c) => newUserCardIds.includes(c.userCardId))).toEqual([
      true,
      false,
      false,
      false,
      true,
    ]);
    const discoveries = await db
      .select()
      .from(cardDiscovery)
      .where(eq(cardDiscovery.userId, ctx.session.user.id));
    expect(discoveries).toHaveLength(2);

    const second = await handler({ input: { packId: p.id }, ctx });
    expect(second.newUserCardIds).toEqual([]);
  });

  test("同時に開けた2パックで同じカードが初登場しても NEW は1枚だけ", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id, type: "premium", priceCoins: 0 });
    const open = () => handler({ ctx, input: { packId: p.id } });
    const results = await Promise.all([open(), open()]);
    expect(results.flatMap((result) => result.newUserCardIds)).toHaveLength(1);
  });

  test("同じレアリティの2枚は各枠で半分ずつの確率で選ばれる", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const a = await createCard(db, { genreId: g.id, rarity: "common" });
    const b = await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    const ids = new Set<string>();
    for (const point of [0.49999, 0.5]) {
      const { openingId } = await handler({ ctx, input: { packId: p.id }, random: () => point });
      const drawn = await db.select().from(userCard).where(eq(userCard.packOpeningId, openingId));
      expect(drawn).toHaveLength(5);
      const id = drawn[0]!.cardId;
      expect(drawn.every((c) => c.cardId === id)).toBe(true);
      ids.add(id);
    }
    expect(ids).toEqual(new Set([a.id, b.id]));
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

  test("初期枠10を使い切ると10分ごとに1つ回復し、100分で満杯になる", async () => {
    setSystemTime(new Date("2026-10-25T03:00:00Z")); // 日本時間 12:00
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });

    await handler({ input: { packId: p.id }, ctx });
    expect(await getFreePackStatus(db, userId, new Date())).toMatchObject({
      remaining: 9,
      nextRefillAt: "2026-10-25T03:10:00.000Z",
    });
    for (let i = 1; i < 10; i++) await handler({ input: { packId: p.id }, ctx });
    const opened = await db.select().from(packOpening).where(eq(packOpening.userId, userId));
    expect(opened.filter((o) => o.payment === "free_daily")).toHaveLength(10);
    expect(opened.filter((o) => o.payment === "free_initial")).toHaveLength(0);
    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    for (const [elapsed, remaining] of [
      [599999, 0],
      [600000, 1],
      [5999999, 9],
      [6000000, 10],
    ] as const) {
      const time = new Date(Date.parse("2026-10-25T03:00:00Z") + elapsed);
      expect((await getFreePackStatus(db, userId, time)).remaining).toBe(remaining);
    }
    // 長時間満杯でも、再び開けるとその時点から10分待つ。
    setSystemTime(new Date("2026-10-28T03:00:00Z"));
    expect((await getFreePackStatus(db, userId, new Date())).remaining).toBe(10);
    for (let i = 0; i < 10; i++) await handler({ input: { packId: p.id }, ctx });
    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  test("残り1つの同時開封は1件だけ成功し、日付をまたいでも回復途中の時間を保持する", async () => {
    setSystemTime(new Date("2026-10-25T14:59:59Z"));
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    await db.insert(freePackAllowance).values({ userId, fullAt: Date.now() + 85 * 60_000 });
    expect(await getFreePackStatus(db, userId, new Date())).toMatchObject({ remaining: 1 });
    const results = await Promise.allSettled([
      handler({ input: { packId: p.id }, ctx }),
      handler({ input: { packId: p.id }, ctx }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await getFreePackStatus(db, userId, new Date())).toMatchObject({ remaining: 0 });
    await expect(handler({ input: { packId: p.id }, ctx })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    setSystemTime(new Date("2026-10-25T15:00:00Z"));
    expect(await getFreePackStatus(db, userId, new Date())).toMatchObject({
      remaining: 0,
      nextRefillAt: "2026-10-25T15:04:59.000Z",
    });
    setSystemTime(new Date("2026-10-25T15:04:59Z"));
    await handler({ input: { packId: p.id }, ctx });
    expect(await getFreePackStatus(db, userId, new Date())).toMatchObject({
      remaining: 0,
      nextRefillAt: "2026-10-25T15:14:59.000Z",
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
      message: "pt が足りません",
    });
    const openings = await db
      .select()
      .from(packOpening)
      .where(and(eq(packOpening.userId, userId)));
    expect(openings).toHaveLength(0);
    expect((await getCoinBalance(db, userId)).total).toBe(149);
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
