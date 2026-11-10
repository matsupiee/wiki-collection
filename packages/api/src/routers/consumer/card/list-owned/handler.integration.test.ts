import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { card, userCard, cardDiscovery } from "@wiki-collection/db/schema/index";
import { appRouter } from "../../../index";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler as createListingHandler } from "../../market/create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/list-owned", () => {
  test("同じカードをまとめて所持数と出品数を返す。履歴用のコピーは数えない", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    const common = await createCard(db, { genreId: g.id, rarity: "common" });
    const rare = await createCard(db, { genreId: g.id, rarity: "rare" });
    await db.insert(userCard).values({ userId, cardId: common.id, status: "archived" });
    const c2 = await giveCard(db, userId, common.id);
    await giveCard(db, userId, common.id);
    await giveCard(db, userId, rare.id);
    await createListingHandler({
      input: { format: "auction", userCardId: c2.id, startPrice: 10, durationHours: 24 },
      ctx,
    });

    const result = await handler({ input: {}, ctx });

    expect(result.cards.map((c) => [c.id, c.ownedCount, c.listedCount])).toEqual([
      [rare.id, 1, 0],
      [common.id, 1, 1],
    ]);
  });

  test("引いた順・閲覧数順・記事サイズ順と絞り込みを併用でき、集約結果は変わらない", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    const specs = [
      { rarity: "rare" as const, monthlyPageviews: 900, articleLength: 100, time: 1000 },
      { rarity: "rare" as const, monthlyPageviews: 500, articleLength: 900, time: 2000 },
      { rarity: "common" as const, monthlyPageviews: 500, articleLength: 500, time: 3000 },
      { rarity: "common" as const, monthlyPageviews: 0, articleLength: null, time: 4000 },
    ];
    const ids: string[] = [];
    for (const spec of specs) {
      const c = await createCard(db, { genreId: g.id, rarity: spec.rarity });
      ids.push(c.id);
      await db
        .update(card)
        .set({ monthlyPageviews: spec.monthlyPageviews, articleLength: spec.articleLength })
        .where(eq(card.id, c.id));
      await db
        .insert(userCard)
        .values({ userId: ctx.session.user.id, cardId: c.id, createdAt: new Date(spec.time) });
    }
    // 他人のコピー・履歴用のコピーは取得順に影響しない。
    await db.insert(userCard).values([
      { userId: other.session.user.id, cardId: ids[0]!, createdAt: new Date(9000) },
      {
        userId: ctx.session.user.id,
        cardId: ids[0]!,
        status: "archived",
        createdAt: new Date(9000),
      },
      { userId: ctx.session.user.id, cardId: ids[1]!, status: "listed", createdAt: new Date(5000) },
    ]);
    const api = appRouter.createCaller(ctx).card;
    const acquired = await api.listOwned({});
    expect(acquired.cards.map((c) => c.id)).toEqual([ids[1]!, ids[3]!, ids[2]!, ids[0]!]);
    for (const [sort, expected] of [
      ["acquired", [ids[1]!, ids[3]!, ids[2]!, ids[0]!]],
      ["monthlyPageviews", [ids[0]!, ids[1]!, ids[2]!, ids[3]!]],
      ["articleLength", [ids[1]!, ids[2]!, ids[0]!, ids[3]!]],
    ] as const) {
      const result = await api.listOwned({ sort });
      expect(result.cards.map((c) => c.id)).toEqual([...expected]);
      expect(result.cards.find((c) => c.id === ids[1])).toMatchObject({
        ownedCount: 1,
        listedCount: 1,
      });
      const filtered = await api.listOwned({ sort, rarity: "rare", genreId: g.id });
      expect(filtered.cards.map((c) => c.id)).toEqual(
        expected.filter((id) => id === ids[0] || id === ids[1]),
      );
    }
    await expect(api.listOwned({ sort: "invalid" as "monthlyPageviews" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("日時と記事データが同じでもカード ID 順で安定する", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const c = await createCard(db, { genreId: g.id, rarity: "rare" });
      ids.push(c.id);
      await db
        .insert(userCard)
        .values({ userId: ctx.session.user.id, cardId: c.id, createdAt: new Date(1000) });
    }
    for (const sort of ["acquired", "monthlyPageviews", "articleLength"] as const) {
      expect((await handler({ ctx, input: { sort } })).cards.map((c) => c.id)).toEqual(
        [...ids].sort(),
      );
    }
  });

  test("取得履歴だけのカードと未取得のカードを一覧に含めない", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const owned = await createCard(db, { genreId: g.id, rarity: "common" });
    const released = await createCard(db, { genreId: g.id, rarity: "common" });
    await createCard(db, { genreId: g.id, rarity: "common" });
    await giveCard(db, ctx.session.user.id, owned.id);
    await db.insert(cardDiscovery).values({
      userId: ctx.session.user.id,
      cardId: released.id,
      firstAcquiredAt: new Date(),
    });
    const result = await appRouter.createCaller(ctx).card.listOwned({});
    expect(result.cards.map((c) => c.id)).toEqual([owned.id]);
  });

  test.each(["redeem", "redeemDuplicates"])(
    "廃止したカード還元API %s は開けない",
    async (method) => {
      const ctx = await createUserContext(db);
      const caller = appRouter.createCaller(ctx).card as unknown as Record<
        string,
        (input: object) => Promise<unknown>
      >;
      await expect(caller[method]!({})).rejects.toMatchObject({ code: "NOT_FOUND" });
    },
  );

  test("削除した図鑑 API は NOT_FOUND を返す", async () => {
    const ctx = await createUserContext(db);
    const caller = appRouter.createCaller(ctx) as unknown as {
      card: { listDex: (input: object) => Promise<unknown> };
    };
    await expect(caller.card.listDex({})).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("レアリティで絞り込める", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const common = await createCard(db, { genreId: g.id, rarity: "common" });
    const rare = await createCard(db, { genreId: g.id, rarity: "rare" });
    await giveCard(db, ctx.session.user.id, common.id);
    await giveCard(db, ctx.session.user.id, rare.id);
    const result = await handler({ input: { rarity: "rare" }, ctx });
    expect(result.cards.map((c) => c.id)).toEqual([rare.id]);
  });
});
