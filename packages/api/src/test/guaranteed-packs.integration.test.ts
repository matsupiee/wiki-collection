import { expect, test } from "bun:test";
import { card, packOpening, userCard } from "@wiki-collection/db/schema/index";
import { syncGuaranteedPacks } from "@wiki-collection/db/seed/packs";
import { eq } from "drizzle-orm";

import { handler as list } from "../routers/consumer/pack/list/handler";
import { handler as open } from "../routers/consumer/pack/open/handler";
import { getCoinBalance } from "../shared/coin/get-coin-balance";
import { createTestDb } from "./create-test-db";
import { createCard, createGenre, createPack, createUserContext, grantCoins } from "./fixtures";

test("ジャンルパックを終了し、確定ガチャは1枚の保証と価格を守る", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const genre = await createGenre(db);
    const old = await createPack(db, { type: "premium", genreId: genre.id });
    const basic = await createPack(db);
    const common = await createCard(db, { genreId: genre.id, rarity: "common" });
    const superRare = await createCard(db, { genreId: genre.id, rarity: "super_rare" });
    const legend = await createCard(db, { genreId: genre.id, rarity: "legendary" });
    await grantCoins(db, userId, 2000);
    await open({ ctx, input: { packId: old.id } });
    await syncGuaranteedPacks(db);
    await syncGuaranteedPacks(db);
    const catalog = await list({ ctx });
    expect(catalog.packs.map((p) => p.slug)).toEqual([
      basic.slug,
      "double-rare-guaranteed",
      "legend-guaranteed",
    ]);
    await expect(open({ ctx, input: { packId: old.id } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await db.select().from(packOpening).where(eq(packOpening.packId, old.id))).toHaveLength(
      1,
    );
    for (const [slug, price, random, fourth, guaranteed] of [
      ["double-rare-guaranteed", 100, 0, common.id, superRare.id],
      ["double-rare-guaranteed", 100, 0.99999, legend.id, superRare.id],
      ["legend-guaranteed", 500, 0, common.id, legend.id],
    ] as const) {
      const selected = catalog.packs.find((p) => p.slug === slug)!;
      const before = await getCoinBalance(db, userId);
      const opened = await open({ ctx, input: { packId: selected.id }, random: () => random });
      const drawn = await db
        .select()
        .from(userCard)
        .where(eq(userCard.packOpeningId, opened.openingId));
      expect(drawn.map((c) => c.cardId).sort()).toEqual(
        [common.id, common.id, common.id, fourth, guaranteed].sort(),
      );
      expect((await getCoinBalance(db, userId)).total).toBe(before.total - price);
    }
    await db.update(card).set({ isActive: false }).where(eq(card.id, legend.id));
    await db.update(card).set({ isActive: false }).where(eq(card.id, superRare.id));
    const balance = await getCoinBalance(db, userId);
    for (const selected of catalog.packs.filter((p) => p.type === "premium")) {
      await expect(open({ ctx, input: { packId: selected.id } })).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
      });
    }
    expect(await getCoinBalance(db, userId)).toEqual(balance);
    expect(await db.select().from(packOpening)).toHaveLength(4);
  } finally {
    await dispose();
  }
});
