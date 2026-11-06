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
  await expect(a.api.card.redeem({ userCardId: input.materialId })).rejects.toMatchObject({
    code: "PRECONDITION_FAILED",
  });
  await expect(
    a.api.battle.saveTeam({ slot: 1, name: "消費済み", members: a.members }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
});
test("出品中・還元済みの合成拒否と強化後の売買引継ぎ", async () => {
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
  await a.api.card.redeem({ userCardId: a.members[2]! });
  await expect(
    a.api.battle.fuse({ baseId: a.copies[3]!.id, materialId: a.members[2]! }),
  ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  await grantCoins(db, b.ctx.session.user.id, 100);
  await b.api.market.buy({ listingId: listing.listingId });
  const bought = (await b.api.battle.inventory()).find((c) => c.id === a.members[0]);
  expect(bought!.attackBonus).toBeCloseTo(gain.attackGain, 9);
});
