import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { appRouter } from "../../../index";
import { createTestDb } from "../../../../test/create-test-db";
import { createUserContext, createGenre, createCard, giveCard } from "../../../../test/fixtures";
let db: Database, dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
async function setup() {
  const ctx = await createUserContext(db),
    g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "common" });
  const copies = [];
  for (let i = 0; i < 8; i++) copies.push(await giveCard(db, ctx.session.user.id, c.id));
  return {
    ctx,
    c,
    copies,
    api: appRouter.createCaller(ctx),
    members: copies.slice(0, 3).map((c) => c.id),
  };
}

test("未認証のチーム・合成・ランキングAPIは利用不可", async () => {
  const api = appRouter.createCaller({ db, session: null, paymentMode: "mock" });
  await expect(api.battle.teams()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(api.battle.ranking({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(api.battle.fuse({ baseId: "a", materialId: "b" })).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

test("チーム一覧は本人の枠だけを順に返す", async () => {
  const a = await setup(),
    b = await setup();
  await a.api.battle.saveTeam({ slot: 3, name: "3", members: a.members });
  await a.api.battle.saveTeam({ slot: 1, name: "1", members: a.members });
  await b.api.battle.saveTeam({ slot: 2, name: "他人", members: b.members });
  expect((await a.api.battle.teams()).map((t) => t.slot)).toEqual([1, 3]);
});
