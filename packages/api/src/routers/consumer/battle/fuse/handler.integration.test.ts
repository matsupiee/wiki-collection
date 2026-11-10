import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { cardFusion, userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";
import { appRouter } from "../../../index";
import { createTestDb } from "../../../../test/create-test-db";
import {
  createUserContext,
  createGenre,
  createCard,
  giveCard,
  grantCoins,
} from "../../../../test/fixtures";
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

test("合成で素材を1枚消費・小数加算・同じ素材の同時消費は1回だけ", async () => {
  const a = await setup(),
    b = await setup();
  const input = { baseId: a.members[0]!, materialId: a.members[1]! };
  await expect(b.api.battle.fuse(input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await expect(
    a.api.battle.fuse({ baseId: input.baseId, materialId: input.baseId }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  const outcomes = await Promise.allSettled([a.api.battle.fuse(input), a.api.battle.fuse(input)]);
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const success = outcomes.find((r) => r.status === "fulfilled");
  if (!success || success.status !== "fulfilled") throw new Error("no fusion");
  const [base] = await db.select().from(userCard).where(eq(userCard.id, input.baseId));
  const [material] = await db.select().from(userCard).where(eq(userCard.id, input.materialId));
  expect(base!.attackBonus).toBeCloseTo(success.value.attackGain, 9);
  expect(base!.defenseBonus).toBeCloseTo(success.value.defenseGain, 9);
  expect(material!.status).toBe("fused");
  expect(
    await db.select().from(cardFusion).where(eq(cardFusion.materialId, input.materialId)),
  ).toHaveLength(1);
  await expect(
    a.api.battle.saveTeam({ slot: 1, name: "消費済み", members: a.members }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
});
test("出品中・合成済みの合成拒否と強化後の売買引継ぎ", async () => {
  const a = await setup(),
    b = await setup();
  const gain = await a.api.battle.fuse({ baseId: a.members[0]!, materialId: a.members[1]! });
  const listing = await a.api.market.createListing({
    userCardId: a.members[0]!,
    format: "fixed_price",
    price: 10,
  });
  await expect(
    a.api.battle.fuse({ baseId: a.members[0]!, materialId: a.members[2]! }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await expect(
    a.api.battle.fuse({ baseId: a.members[2]!, materialId: a.members[0]! }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await a.api.battle.fuse({ baseId: a.copies[4]!.id, materialId: a.members[2]! });
  await expect(
    a.api.battle.fuse({ baseId: a.copies[3]!.id, materialId: a.members[2]! }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await grantCoins(db, b.ctx.session.user.id, 100);
  await b.api.market.buy({ listingId: listing.listingId });
  const bought = (await b.api.battle.inventory()).find((c) => c.id === a.members[0]);
  expect(bought!.attackBonus).toBeCloseTo(gain.attackGain, 9);
});

test("同じ種類の5枚から3枚と別のカードを一括消費し、素材ごとの加算を合計する", async () => {
  const a = await setup();
  const other = await createCard(db, { genreId: a.c.genreId, rarity: "common" });
  const otherCopy = await giveCard(db, a.ctx.session.user.id, other.id);
  const materialIds = [a.copies[1]!.id, a.copies[2]!.id, a.copies[3]!.id, otherCopy.id];
  await db
    .update(userCard)
    .set({ attackBonus: 50, defenseBonus: 10 })
    .where(eq(userCard.id, otherCopy.id));
  const result = await a.api.battle.fuse({ baseId: a.copies[0]!.id, materialIds });
  expect(result.materialCount).toBe(4);
  const history = await db.select().from(cardFusion).where(eq(cardFusion.baseId, a.copies[0]!.id));
  expect(history).toHaveLength(4);
  expect(result.attackGain).toBeCloseTo(
    history.reduce((sum, r) => sum + r.attackGain, 0),
    9,
  );
  expect(result.defenseGain).toBeCloseTo(
    history.reduce((sum, r) => sum + r.defenseGain, 0),
    9,
  );
  for (const row of history) {
    expect(row.coefficient).toBeGreaterThanOrEqual(0.2);
    expect(row.coefficient).toBeLessThanOrEqual(1);
    expect(row.attackGain).toBeCloseTo(
      (row.materialId === otherCopy.id ? 1050 : 1000) * 0.01 * row.coefficient,
      9,
    );
  }
  const owned = await a.api.battle.inventory();
  expect(owned.some((c) => materialIds.includes(c.id))).toBe(false);
  expect(owned.find((c) => c.id === a.copies[0]!.id)!.attackBonus).toBeCloseTo(
    result.attackGain,
    9,
  );
  expect(owned.find((c) => c.id === a.copies[4]!.id)!.attackBonus).toBe(0);
});

test("空・重複・ベース混入・上限超過・旧新形式の混在を拒否", async () => {
  const a = await setup(),
    baseId = a.copies[0]!.id;
  for (const materialIds of [
    [],
    [a.copies[1]!.id, a.copies[1]!.id],
    [baseId],
    Array.from({ length: 51 }, (_, i) => `material-${i}`),
  ]) {
    await expect(a.api.battle.fuse({ baseId, materialIds })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  }
  await expect(
    a.api.battle.fuse({
      baseId,
      materialIds: [a.copies[1]!.id],
      materialId: a.copies[2]!.id,
    } as never),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

test("最後の素材が編成中なら履歴・消費・強化をすべてロールバックする", async () => {
  const a = await setup();
  await a.api.battle.saveTeam({
    slot: 1,
    name: "素材保護",
    members: a.copies.slice(5, 8).map((c) => c.id),
  });
  const baseId = a.copies[0]!.id,
    materialIds = [a.copies[1]!.id, a.copies[2]!.id, a.copies[5]!.id];
  await expect(a.api.battle.fuse({ baseId, materialIds })).rejects.toMatchObject({
    code: "PRECONDITION_FAILED",
  });
  expect(await db.select().from(cardFusion).where(eq(cardFusion.baseId, baseId))).toHaveLength(0);
  const owned = await a.api.battle.inventory();
  expect(owned.filter((c) => materialIds.includes(c.id))).toHaveLength(3);
  expect(owned.find((c) => c.id === baseId)!.attackBonus).toBe(0);
});

test("他人の素材を含む一括強化は全件拒否する", async () => {
  const a = await setup(),
    b = await setup();
  await expect(
    a.api.battle.fuse({ baseId: a.copies[0]!.id, materialIds: [a.copies[1]!.id, b.copies[1]!.id] }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  expect((await a.api.battle.inventory()).some((c) => c.id === a.copies[1]!.id)).toBe(true);
});

test("一部重複する一括強化の競合は片方だけ成功し、敗者の非共有素材も残る", async () => {
  const a = await setup();
  const sets = [
    [a.copies[2]!.id, a.copies[3]!.id],
    [a.copies[3]!.id, a.copies[4]!.id],
  ];
  const outcomes = await Promise.allSettled(
    sets.map((materialIds, i) => a.api.battle.fuse({ baseId: a.copies[i]!.id, materialIds })),
  );
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = outcomes.findIndex((r) => r.status === "fulfilled");
  const rows = await db.select().from(userCard).where(eq(userCard.userId, a.ctx.session.user.id));
  expect(
    rows
      .filter((r) => r.status === "fused")
      .map((r) => r.id)
      .sort(),
  ).toEqual([...sets[winner]!].sort());
  expect(rows.find((r) => r.id === a.copies[1 - winner]!.id)!.attackBonus).toBe(0);
});

test("異なる素材を同じベースへ同時合成しても両方の加算が残る", async () => {
  const a = await setup();
  const results = await Promise.all([
    a.api.battle.fuse({
      baseId: a.copies[0]!.id,
      materialIds: a.copies.slice(1, 3).map((c) => c.id),
    }),
    a.api.battle.fuse({
      baseId: a.copies[0]!.id,
      materialIds: a.copies.slice(3, 5).map((c) => c.id),
    }),
  ]);
  const base = (await a.api.battle.inventory()).find((c) => c.id === a.copies[0]!.id)!;
  expect(base.attackBonus).toBeCloseTo(
    results.reduce((sum, r) => sum + r.attackGain, 0),
    9,
  );
});

test("最大50枚の一括強化がD1の変数上限内で成功する", async () => {
  const a = await setup();
  const materials = a.copies.slice(1).map((c) => c.id);
  while (materials.length < 50)
    materials.push((await giveCard(db, a.ctx.session.user.id, a.c.id)).id);
  const result = await a.api.battle.fuse({ baseId: a.copies[0]!.id, materialIds: materials });
  expect(result.materialCount).toBe(50);
  expect((await a.api.battle.inventory()).map((c) => c.id)).toEqual([a.copies[0]!.id]);
});
