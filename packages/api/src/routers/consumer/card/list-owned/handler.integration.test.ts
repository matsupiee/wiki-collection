import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cardDiscovery } from "@wiki-collection/db/schema/index";
import { appRouter } from "../../../index";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler as redeemHandler } from "../redeem/handler";
import { handler as createListingHandler } from "../../market/create-listing/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/list-owned", () => {
  test("同じカードをまとめて所持数と出品数を返す。還元済みのカードは数えない", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    const common = await createCard(db, { genreId: g.id, rarity: "common" });
    const rare = await createCard(db, { genreId: g.id, rarity: "rare" });
    const c1 = await giveCard(db, userId, common.id);
    const c2 = await giveCard(db, userId, common.id);
    await giveCard(db, userId, common.id);
    await giveCard(db, userId, rare.id);
    await redeemHandler({ input: { userCardId: c1.id }, ctx });
    await createListingHandler({
      input: { format: "fixed_price", userCardId: c2.id, price: 10 },
      ctx,
    });

    const result = await handler({ input: {}, ctx });

    expect(result.cards.map((c) => [c.id, c.ownedCount, c.listedCount])).toEqual([
      [rare.id, 1, 0],
      [common.id, 1, 1],
    ]);
    // 出品中の1枚を残すので、所持中のコモン1枚が重複として還元対象になる
    expect(result.duplicates).toEqual({ count: 1, points: 1 });
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
