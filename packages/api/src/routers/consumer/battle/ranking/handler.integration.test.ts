import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { type Fighter } from "@wiki-collection/db/battle";
import { battleDay, battleTeam, genre } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";
import { appRouter } from "../../../index";
import { createTestDb } from "../../../../test/create-test-db";
import { createUserContext, createGenre, createCard, giveCard } from "../../../../test/fixtures";
import { rankTeams, runDailyBattles } from "../../../../shared/battle/run-daily-battles";
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

test("日次総当たり・日本時間境界・再実行と同時実行の冪等性・編成変更後も結果が保存される", async () => {
  await db.delete(battleTeam);
  const a = await setup(),
    b = await setup();
  await a.api.battle.saveTeam({ slot: 1, name: "A1", members: a.members });
  await a.api.battle.saveTeam({ slot: 2, name: "A2", members: a.members });
  await b.api.battle.saveTeam({ slot: 1, name: "B1", members: b.members });
  const before = await runDailyBattles(db, new Date("2026-11-10T14:59:59Z"));
  expect(before.date).toBe("2026-11-10");
  const [day, retry] = await Promise.all([
    runDailyBattles(db, new Date("2026-11-10T15:00:00Z")),
    runDailyBattles(db, new Date("2026-11-10T15:00:00Z")),
  ]);
  expect(day.date).toBe("2026-11-11");
  expect(retry.id).toBe(day.id);
  expect(day.ranking).toHaveLength(3);
  for (const row of day.ranking)
    expect(row.wins + row.losses + row.draws).toBe(row.userId === a.ctx.session.user.id ? 1 : 2);
  await a.api.battle.fuse({ baseId: a.members[0]!, materialId: a.copies[3]!.id });
  await a.api.battle.deleteTeam({ slot: 1 });
  expect((await runDailyBattles(db, new Date("2026-11-10T15:00:00Z"))).ranking).toEqual(
    day.ranking,
  );
  expect((await a.api.battle.ranking({ date: "2026-11-11" }))!.ranking).toEqual(day.ranking);
  expect(await db.select().from(battleDay).where(eq(battleDay.date, day.date))).toHaveLength(1);
});
test("空の日と対戦相手なし・同率順位", () => {
  expect(rankTeams([])).toEqual([]);
  const m: Fighter = { id: "x", title: "同値", attack: 100, defense: 100, element: "person" };
  const make = (id: string, userId: string) => ({
    id,
    userId,
    player: id,
    name: id,
    members: [m, m, m],
  });
  expect(rankTeams([make("a", "a")])[0]).toMatchObject({ points: 0, wins: 0, draws: 0 });
  expect(rankTeams([make("a", "a"), make("b", "b"), make("c", "b")]).map((r) => r.rank)).toEqual([
    1, 1, 1,
  ]);
});

test("旧属性で保存されたランキングも読み出せ、過去の結果を変更しない", async () => {
  const a = await setup();
  const ranking = rankTeams([
    {
      id: "legacy",
      userId: a.ctx.session.user.id,
      player: "旧データ",
      name: "旧チーム",
      members: ["fire", "water", "grass"].map((element, i) => ({
        id: String(i),
        title: "旧カード",
        attack: 100,
        defense: 10,
        element: element as Fighter["element"],
      })),
    },
  ]);
  await db.insert(battleDay).values({ date: "2026-10-01", ranking });
  expect((await a.api.battle.ranking({ date: "2026-10-01" }))!.ranking).toEqual(ranking);
});

test("新しい対戦ではジャンルの属性を能力値とともに保存する", async () => {
  const a = await setup();
  await db.update(genre).set({ slug: "sample-spacecraft" }).where(eq(genre.id, a.c.genreId));
  const team = await a.api.battle.saveTeam({ slot: 1, name: "科学技術", members: a.members });
  const day = await runDailyBattles(db, new Date("2026-12-01T15:00:00Z"));
  expect(day.ranking.find((t) => t.id === team.id)!.members.map((m) => m.element)).toEqual([
    "technology",
    "technology",
    "technology",
  ]);
});
