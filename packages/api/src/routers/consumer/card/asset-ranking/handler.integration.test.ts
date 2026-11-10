import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@wiki-collection/db";
import { card, user, userCard } from "@wiki-collection/db/schema/index";
import { appRouter } from "../../../index";
import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext } from "../../../../test/fixtures";

let db: Database;
let dispose: () => Promise<void>;
beforeEach(async () => ({ db, dispose } = await createTestDb()));
afterEach(() => dispose());

test("各コピーを四捨五入し、出品・譲渡・合成後も現在の所持分だけを数える", async () => {
  const a = await createUserContext(db, "青");
  const b = await createUserContext(db, "赤");
  const api = appRouter.createCaller(a).card;
  expect(await api.assetRanking()).toEqual({ mine: null, leaders: [] });
  await expect(
    appRouter.createCaller({ ...a, session: null }).card.assetRanking(),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "common", isActive: false });
  await db
    .update(card)
    .set({ monthlyPageviews: 160, articleLength: 2679 })
    .where(eq(card.id, c.id));
  const [listed] = await db
    .insert(userCard)
    .values([
      { userId: a.session.user.id, cardId: c.id, status: "listed" },
      { userId: a.session.user.id, cardId: c.id, attackBonus: 500 },
      { userId: a.session.user.id, cardId: c.id, status: "fused" },
      { userId: b.session.user.id, cardId: c.id },
    ])
    .returning();
  expect(await api.assetRanking()).toEqual({
    mine: { rank: 1, total: 674 },
    leaders: [
      { name: "青", rank: 1, total: 674, mine: true },
      { name: "赤", rank: 2, total: 337, mine: false },
    ],
  });
  await db
    .update(userCard)
    .set({ userId: b.session.user.id, status: "owned" })
    .where(eq(userCard.id, listed!.id));
  expect((await api.assetRanking()).mine).toEqual({ rank: 2, total: 337 });
  await db.update(card).set({ monthlyPageviews: 60, articleLength: null }).where(eq(card.id, c.id));
  expect((await api.assetRanking()).mine).toEqual({ rank: 2, total: 170 });
});

test("同点の50人と圏外の本人の順位を取得できる", async () => {
  const ctx = await createUserContext(db);
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "rare" });
  const users = Array.from({ length: 50 }, (_, i) => ({
    id: `rank-${i}`,
    name: `参加者${i}`,
    email: `rank-${i}@example.com`,
  }));
  for (const u of users) {
    await db.insert(user).values(u);
    await db
      .insert(userCard)
      .values(Array.from({ length: 2 }, () => ({ userId: u.id, cardId: c.id })));
  }
  await db.insert(userCard).values({ userId: ctx.session.user.id, cardId: c.id });
  const result = await appRouter.createCaller(ctx).card.assetRanking();
  expect(result.leaders).toHaveLength(50);
  expect(result.leaders.every((row) => row.rank === 1 && !row.mine)).toBe(true);
  expect(result.mine?.rank).toBe(51);
});
