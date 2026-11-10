import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { packSlotRate } from "@wiki-collection/db/schema/index";
import { appRouter } from "../routers/index";
import { createTestDb } from "./create-test-db";
import { createCard, createGenre, createPack, createUserContext, giveCard } from "./fixtures";

test("旧カードを保存済みの閲覧数で再分類し、所持品とパックの重みを維持する", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const ctx = await createUserContext(db);
    const genre = await createGenre(db);
    const pack = await createPack(db);
    await db.run(sql`INSERT INTO pack_slot_rate (id, pack_id, slot, rarity, weight)
      VALUES ('old-rate', ${pack.id}, 1, 'uncommon', 3)`);
    const boundaries = [
      [9999, "common"],
      [10000, "rare"],
      [49999, "rare"],
      [50000, "super_rare"],
      [99999, "super_rare"],
      [100000, "legendary"],
    ] as const;
    const ids: string[] = [];
    for (const [views] of boundaries) {
      const c = await createCard(db, { genreId: genre.id, rarity: "rare" });
      await db.run(
        sql`UPDATE card SET rarity = 'uncommon', monthly_pageviews = ${views} WHERE id = ${c.id}`,
      );
      await giveCard(db, ctx.session.user.id, c.id);
      ids.push(c.id);
    }

    const migration = await Bun.file(
      new URL(
        "../../../db/src/migrations/20261110135012_fixed_card_rarities/migration.sql",
        import.meta.url,
      ),
    ).text();
    for (const statement of migration.split("--> statement-breakpoint")) {
      await db.run(sql.raw(statement));
    }
    const api = appRouter.createCaller(ctx).card;
    const { cards } = await api.listOwned({});
    expect(cards).toHaveLength(boundaries.length);
    for (const [index, [views, rarity]] of boundaries.entries()) {
      expect(cards.find((c) => c.id === ids[index])).toMatchObject({
        rarity,
        monthlyPageviews: views,
        ownedCount: 1,
      });
    }
    expect((await api.listOwned({ rarity: "super_rare" })).cards).toHaveLength(2);
    const rates = await db.select().from(packSlotRate).where(eq(packSlotRate.packId, pack.id));
    expect(rates.filter((r) => r.slot === 1)).toMatchObject([{ rarity: "common", weight: 4 }]);
  } finally {
    await dispose();
  }
});
