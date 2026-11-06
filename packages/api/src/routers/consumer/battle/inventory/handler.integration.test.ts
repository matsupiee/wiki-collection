import { eq } from "drizzle-orm";
import { cardDiscovery, genre } from "@wiki-collection/db/schema/index";
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import {
  duel,
  fight,
  fusionGains,
  affinityRules,
  elementOf,
  type Fighter,
} from "@wiki-collection/db/battle";
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

test("属性の弱点・防御・引き分け・3組の勝敗と合成係数の両端", () => {
  const person: Fighter = { id: "a", title: "人物", attack: 100, defense: 50, element: "person" };
  const culture: Fighter = { ...person, id: "b", element: "culture" };
  for (const rule of affinityRules) {
    expect(duel({ ...person, element: rule.from }, { ...person, element: rule.to })).toBe(1);
    expect(duel({ ...person, element: rule.to }, { ...person, element: rule.from })).toBe(-1);
  }
  expect(duel(person, { ...person, element: "society" })).toBe(0);
  expect(duel(person, { ...person, element: "general" })).toBe(0);
  expect(duel({ ...person, defense: 1000 }, { ...culture, defense: 1000 })).toBe(0);
  expect(fight([person, person, culture], [culture, culture, person])).toBe(1);
  expect(fusionGains(1000, 2000, 0.2)).toEqual({ attackGain: 2, defenseGain: 4 });
  expect(fusionGains(1000, 2000, 1)).toEqual({ attackGain: 10, defenseGain: 20 });
  expect(() => fusionGains(100, 100, NaN)).toThrow();
});
test("所持品ごとの基本値・強化値・属性と編成状態を返す", async () => {
  const a = await setup();
  await a.api.battle.saveTeam({ slot: 1, name: "能力値", members: a.members });
  const gain = await a.api.battle.fuse({ baseId: a.members[0]!, materialId: a.copies[3]!.id });
  const rows = await a.api.battle.inventory();
  expect(rows).toHaveLength(7);
  const base = rows.find((r) => r.id === a.members[0])!;
  expect(base).toMatchObject({ baseAttack: 1000, baseDefense: 1000, inTeam: true });
  expect(base.attack).toBeCloseTo(1000 + gain.attackGain, 9);
  expect(base.defense!).toBeCloseTo(1000 + gain.defenseGain, 9);
});

test("記事IDに依存せずWikidata分類から属性を決め、全画面と対戦で一致する", async () => {
  const ctx = await createUserContext(db);
  const api = appRouter.createCaller(ctx);
  const cases = [
    ["Q5", "person"],
    ["Q726", "nature"],
    ["Q899523", "culture"],
    ["Q6256", "society"],
    ["Q11424", "culture"],
    ["unclassified", "general"],
  ] as const;
  for (const [slug, expected] of cases) {
    const g = await createGenre(db);
    await db.update(genre).set({ slug }).where(eq(genre.id, g.id));
    const c = await createCard(db, { genreId: g.id, rarity: "common" });
    const copy = await giveCard(db, ctx.session.user.id, c.id);
    await db
      .insert(cardDiscovery)
      .values({ userId: ctx.session.user.id, cardId: c.id, firstAcquiredAt: new Date() });
    expect(elementOf(slug)).toBe(expected);
    expect((await api.battle.inventory()).find((r) => r.id === copy.id)!.element).toBe(expected);
    expect((await api.card.listOwned({})).cards.find((r) => r.id === c.id)!.element).toBe(expected);
    expect((await api.card.get({ cardId: c.id })).card.element).toBe(expected);
    const listing = await api.market.createListing({
      userCardId: copy.id,
      format: "fixed_price",
      price: 10,
    });
    expect((await api.market.get({ listingId: listing.listingId })).card.element).toBe(expected);
  }
  expect(elementOf("Q523")).toBe("nature");
  expect(elementOf("Q634")).toBe("nature");
  expect(elementOf("sample-planet")).toBe("nature");
  expect(elementOf("sample-spacecraft")).toBe("culture");
  expect(elementOf("sample-human")).toBe("person");
});
