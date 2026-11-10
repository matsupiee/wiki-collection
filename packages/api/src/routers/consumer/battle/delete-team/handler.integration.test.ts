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

test("編成中カードは出品・合成素材から保護し、ベースとしての強化は可能", async () => {
  const a = await setup();
  await a.api.battle.saveTeam({ slot: 1, name: "保護", members: a.members });
  await expect(
    a.api.market.createListing({ userCardId: a.members[0]!, format: "fixed_price", price: 10 }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await expect(
    a.api.battle.fuse({ baseId: a.copies[3]!.id, materialId: a.members[0]! }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  const fused = await a.api.battle.fuse({ baseId: a.members[0]!, materialId: a.copies[3]!.id });
  expect(fused.attackGain).toBeGreaterThanOrEqual(2);
  expect(fused.attackGain).toBeLessThanOrEqual(10);
  expect(await a.api.battle.inventory()).toHaveLength(7);
  await a.api.battle.deleteTeam({ slot: 1 });
  await a.api.market.createListing({ userCardId: a.members[0]!, format: "fixed_price", price: 10 });
});
