import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext } from "../../../../test/fixtures";
import { cardDiscovery } from "@wiki-collection/db/schema/index";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/list-dex", () => {
  test("ジャンルごとのコンプリート数を返し、未発見のカードはタイトルを隠す", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db, "図鑑テスト");
    const found = await createCard(db, { genreId: g.id, rarity: "common", title: "発見済み" });
    const hidden = await createCard(db, { genreId: g.id, rarity: "rare", title: "未発見" });
    const retiredFound = await createCard(db, {
      genreId: g.id,
      rarity: "rare",
      title: "排出停止",
      isActive: false,
    });
    await createCard(db, {
      genreId: g.id,
      rarity: "rare",
      title: "排出停止で未発見",
      isActive: false,
    });
    await db.insert(cardDiscovery).values([
      { userId: ctx.session.user.id, cardId: found.id, firstAcquiredAt: new Date() },
      { userId: ctx.session.user.id, cardId: retiredFound.id, firstAcquiredAt: new Date() },
    ]);

    const result = await handler({ input: { genreId: g.id }, ctx });

    expect(result.genres.find((x) => x.id === g.id)).toMatchObject({ total: 3, discovered: 2 });
    expect(result.cards.find((c) => c.id === found.id)).toMatchObject({
      title: "発見済み",
      discovered: true,
    });
    expect(result.cards.find((c) => c.id === hidden.id)).toMatchObject({
      title: null,
      discovered: false,
    });
    expect(result.cards).toHaveLength(3);
  });
});
