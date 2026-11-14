import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import {
  coinDeposit,
  packOpening,
  userCard,
  userQuestCompletion,
} from "@wiki-collection/db/schema/index";
import { questDefinitions } from "@wiki-collection/db/quests/definitions";
import { listQuests, prepareQuestRewards } from "@wiki-collection/db/quests/rewards";
import { seedQuestHistory } from "@wiki-collection/db/seed/quest-history";
import { eq, sql } from "drizzle-orm";
import { appRouter } from "../../index";
import { createTestDb } from "../../../test/create-test-db";
import {
  createCard,
  createGenre,
  createPack,
  createUserContext,
  giveCard,
} from "../../../test/fixtures";
import { handler as open } from "../pack/open/handler";
import { handler as getOpening } from "../opening/get/handler";
import { getCoinBalance } from "../../../shared/coin/get-coin-balance";
import { getFreePackStatus } from "../../../shared/pack/get-free-pack-status";
let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
async function grant(userId: string) {
  const queries = prepareQuestRewards(db, userId, null);
  await db.batch(queries as [(typeof queries)[number], ...typeof queries]);
}

test("一覧はログインユーザーのみ。閲覧だけでは付与せず、初開封は10ptを無償付与する", async () => {
  const ctx = await createUserContext(db);
  const g = await createGenre(db);
  const c = await createCard(db, { genreId: g.id, rarity: "common" });
  await giveCard(db, ctx.session.user.id, c.id);
  const api = appRouter.createCaller(ctx);
  const before = await api.quest.list();
  expect(before.quests).toHaveLength(15);
  expect(before.quests.every((q) => q.progress === 0 && q.completedAt === null)).toBe(true);
  expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(0);
  await expect(
    appRouter.createCaller({ ...ctx, session: null }).quest.list(),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const p = await createPack(db, { genreId: g.id });
  const opening = await open({ ctx, input: { packId: p.id } });
  expect(await getCoinBalance(db, ctx.session.user.id)).toEqual({ total: 10, free: 10, paid: 0 });
  const detail = await getOpening({ ctx, input: { openingId: opening.openingId } });
  expect(detail.questRewards).toEqual([{ questKey: "first_pack", amount: 10 }]);
  expect((await getOpening({ ctx, input: { openingId: opening.openingId } })).questRewards).toEqual(
    detail.questRewards,
  );
  const after = await api.quest.list();
  expect(after.quests.find((q) => q.id === "cards_25")?.progress).toBe(1);
  const other = await createUserContext(db);
  expect(
    (await appRouter.createCaller(other).quest.list()).quests.every((q) => !q.completedAt),
  ).toBe(true);
  expect((await api.coin.listHistory()).entries).toContainEqual(
    expect.objectContaining({
      source: "quest_reward",
      questKey: "first_pack",
      amount: 10,
      isPaid: false,
    }),
  );
});

test("9回・24種類・4ジャンルの次の開封で複数達成し、並行開封でも1段階1回だけ入金する", async () => {
  const ctx = await createUserContext(db);
  await seedQuestHistory(db, ctx.session.user.id);
  await grant(ctx.session.user.id);
  const g = await createGenre(db);
  await createCard(db, { genreId: g.id, rarity: "common" });
  const p = await createPack(db, { genreId: g.id, type: "premium", priceCoins: 0 });
  const results = await Promise.all([
    open({ ctx, input: { packId: p.id } }),
    open({ ctx, input: { packId: p.id } }),
  ]);
  const quests = (await appRouter.createCaller(ctx).quest.list()).quests;
  for (const id of ["packs_10", "cards_25", "genres_5"])
    expect(quests.find((q) => q.id === id)?.completedAt).toBeTruthy();
  const rewards = await Promise.all(
    results.map((r) => getOpening({ ctx, input: { openingId: r.openingId } })),
  );
  expect(rewards.flatMap((r) => r.questRewards)).toHaveLength(3);
  expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(40);
  // 現在の所持者を変えても累計は減らない。
  const other = await createUserContext(db);
  await db
    .update(userCard)
    .set({ ownerId: other.session.user.id })
    .where(eq(userCard.ownerId, ctx.session.user.id));
  expect(await listQuests(db, ctx.session.user.id)).toEqual(quests);
  expect((await listQuests(db, other.session.user.id)).every((q) => q.progress === 0)).toBe(true);
});

test("R・SR・レジェンドはそれぞれ初獲得のみで、上位レアによる下位条件の達成はない", async () => {
  const ctx = await createUserContext(db);
  for (const [rarity, expected] of [
    ["legendary", 60],
    ["super_rare", 80],
    ["rare", 85],
  ] as const) {
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity });
    const p = await createPack(db, {
      genreId: g.id,
      type: "premium",
      priceCoins: 0,
      rates: [1, 2, 3, 4, 5].map((slot) => ({ slot, rarity, weight: 1 })),
    });
    await open({ ctx, input: { packId: p.id } });
    expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(expected);
    await open({ ctx, input: { packId: p.id } });
    expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(expected);
  }
});

test("500開封・1000種類・25ジャンルの全段階を付与し、再実行しても増えない", async () => {
  const ctx = await createUserContext(db);
  await seedQuestHistory(db, ctx.session.user.id, { openings: 500, cards: 1000, genres: 25 });
  const before = await listQuests(db, ctx.session.user.id);
  expect(before.filter((q) => q.progress === q.target)).toHaveLength(12);
  await grant(ctx.session.user.id);
  expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(480);
  const entries = await db
    .select()
    .from(coinDeposit)
    .where(eq(coinDeposit.userId, ctx.session.user.id));
  expect(entries).toHaveLength(12);
  for (const q of questDefinitions.filter((q) => q.group !== "rare")) {
    expect(entries.find((e) => e.note === q.id)?.amount).toBe(q.reward);
  }
  await grant(ctx.session.user.id);
  expect(
    await db.select().from(coinDeposit).where(eq(coinDeposit.userId, ctx.session.user.id)),
  ).toEqual(entries);
  expect(questDefinitions.reduce((sum, q) => sum + q.reward, 0)).toBe(555);
}, 60000);

test("報酬の入金失敗時には開封・達成・カード・無料枠を戻し、再試行で正常付与する", async () => {
  const ctx = await createUserContext(db);
  const g = await createGenre(db);
  await createCard(db, { genreId: g.id, rarity: "common" });
  const p = await createPack(db, { genreId: g.id });
  await db.run(
    sql`CREATE TRIGGER fail_quest_reward BEFORE INSERT ON coin_deposit WHEN NEW.source = 'quest_reward' BEGIN SELECT RAISE(ABORT, 'quest reward failure'); END`,
  );
  try {
    await expect(open({ ctx, input: { packId: p.id } })).rejects.toThrow();
    expect(
      await db.select().from(packOpening).where(eq(packOpening.userId, ctx.session.user.id)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(userQuestCompletion)
        .where(eq(userQuestCompletion.userId, ctx.session.user.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(userCard).where(eq(userCard.ownerId, ctx.session.user.id)),
    ).toHaveLength(0);
    expect((await getFreePackStatus(db, ctx.session.user.id, new Date())).remaining).toBe(10);
  } finally {
    await db.run(sql`DROP TRIGGER fail_quest_reward`);
  }
  await open({ ctx, input: { packId: p.id } });
  expect((await getCoinBalance(db, ctx.session.user.id)).total).toBe(10);
});
