import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { card } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";
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

test("3枚・最大3枠・他人のカードと未計測カードの拒否・更新と削除", async () => {
  const a = await setup(),
    b = await setup();
  for (const slot of [1, 2, 3])
    await a.api.battle.saveTeam({ slot, name: `チーム${slot}`, members: a.members });
  expect(await a.api.battle.teams()).toHaveLength(3);
  await expect(
    a.api.battle.saveTeam({ slot: 4, name: "4", members: a.members }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(
    a.api.battle.saveTeam({
      slot: 1,
      name: "重複",
      members: [a.members[0]!, a.members[0]!, a.members[1]!],
    }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(
    a.api.battle.saveTeam({ slot: 1, name: "他人", members: b.members }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await expect(
    a.api.battle.saveTeam({ slot: 1, name: "不足", members: a.members.slice(0, 2) }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await db.update(card).set({ articleLength: null }).where(eq(card.id, b.c.id));
  await expect(
    b.api.battle.saveTeam({ slot: 1, name: "未計測", members: b.members }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await a.api.battle.saveTeam({ slot: 1, name: "更新", members: [...a.members].reverse() });
  expect((await a.api.battle.teams())[0]?.member1).toBe(a.members[2]);
  await b.api.battle.deleteTeam({ slot: 1 });
  expect(await a.api.battle.teams()).toHaveLength(3);
  for (const slot of [1, 2, 3]) await a.api.battle.deleteTeam({ slot });
  expect(await a.api.battle.teams()).toHaveLength(0);
});
