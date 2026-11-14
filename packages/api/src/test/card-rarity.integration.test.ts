import { expect, test } from "bun:test";
import { rarityFromPageviews } from "@wiki-collection/db/rarity";
import { eq, sql } from "drizzle-orm";
import { packSlotRate, rarityThreshold } from "@wiki-collection/db/schema/index";
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

test("新基準のカードを移行処理が再分類せず、UCと所持品を維持する", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const ctx = await createUserContext(db);
    const genre = await createGenre(db);
    const pack = await createPack(db);
    await db.insert(rarityThreshold).values([
      { wikiLang: "ja", rarity: "rare", minMonthlyPageviews: 10000 },
      { wikiLang: "ja", rarity: "super_rare", minMonthlyPageviews: 50000 },
      { wikiLang: "ja", rarity: "legendary", minMonthlyPageviews: 100000 },
    ]);
    const beforeRates = await db
      .select()
      .from(packSlotRate)
      .where(eq(packSlotRate.packId, pack.id));
    const boundaries = [
      [0, "common"],
      [99, "common"],
      [100, "uncommon"],
      [999, "uncommon"],
      [1000, "rare"],
      [9999, "rare"],
      [10000, "super_rare"],
      [49999, "super_rare"],
      [50000, "super_rare"],
      [99999, "super_rare"],
      [100000, "legendary"],
    ] as const;
    const ids: string[] = [];
    for (const [views, rarity] of boundaries) {
      const c = await createCard(db, { genreId: genre.id, rarity });
      await giveCard(db, ctx.session.user.id, c.id);
      await db.run(sql`UPDATE card SET monthly_pageviews = ${views} WHERE id = ${c.id}`);
      ids.push(c.id);
    }
    const migration = await Bun.file(
      new URL(
        "../../../db/src/migrations/20261114032556_relax_card_rarities/migration.sql",
        import.meta.url,
      ),
    ).text();
    const uncommonMigration = await Bun.file(
      new URL(
        "../../../db/src/migrations/20261114033542_restore_uncommon_rarity/migration.sql",
        import.meta.url,
      ),
    ).text();
    // 完了済みの再分類をデプロイで再実行しない。一時的なUC→Cの更新も拒否する。
    await db.run(sql.raw("CREATE TRIGGER reject_rarity_rewrite BEFORE UPDATE OF rarity ON card BEGIN SELECT RAISE(ABORT, 'card rarity must not be rewritten by deployment'); END"));
    // 再実行しても結果と所持数が変わらない。
    for (let run = 0; run < 2; run++) {
      for (const statement of (
        migration +
        "\n--> statement-breakpoint\n" +
        uncommonMigration
      ).split("--> statement-breakpoint")) {
        await db.run(sql.raw(statement));
      }
    }
    const api = appRouter.createCaller(ctx).card;
    const { cards } = await api.listOwned({});
    expect(cards).toHaveLength(boundaries.length);
    for (const [i, [views, rarity]] of boundaries.entries()) {
      expect(rarityFromPageviews(views)).toBe(rarity);
      expect(cards.find((c) => c.id === ids[i])).toMatchObject({
        rarity,
        monthlyPageviews: views,
        ownedCount: 1,
      });
    }
    for (const rarity of ["common", "uncommon", "rare", "super_rare", "legendary"] as const) {
      expect((await api.listOwned({ rarity })).cards).toHaveLength(
        boundaries.filter((b) => b[1] === rarity).length,
      );
    }
    const afterRates = await db.select().from(packSlotRate).where(eq(packSlotRate.packId, pack.id));
    for (const before of beforeRates) {
      const rows = afterRates.filter((r) => r.slot === before.slot);
      if (before.rarity === "common") {
        expect(rows.find((r) => r.rarity === "uncommon")?.weight).toBe(
          Math.round(before.weight * 0.35),
        );
        expect(rows.find((r) => r.rarity === "common")?.weight).toBe(
          before.weight - Math.round(before.weight * 0.35),
        );
      } else {
        expect(rows.find((r) => r.rarity === before.rarity)).toEqual(before);
      }
    }
    const thresholds = await db.all(
      sql`SELECT rarity, min_monthly_pageviews AS minimum FROM rarity_threshold ORDER BY minimum`,
    );
    expect(thresholds).toEqual([
      { rarity: "uncommon", minimum: 100 },
      { rarity: "rare", minimum: 1000 },
      { rarity: "super_rare", minimum: 10000 },
      { rarity: "legendary", minimum: 100000 },
    ]);
  } finally {
    await dispose();
  }
});

test("UCを開封し、履歴と所持品のUCフィルターで確認できる", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const ctx = await createUserContext(db);
    const genre = await createGenre(db);
    const rarities = ["legendary", "super_rare", "rare", "uncommon", "common"] as const;
    for (const rarity of rarities) await createCard(db, { genreId: genre.id, rarity });
    const pack = await createPack(db, {
      genreId: genre.id,
      rates: rarities.map((rarity, i) => ({ slot: i + 1, rarity, weight: 1 })),
    });
    const queued: string[][] = [];
    const api = appRouter.createCaller({ ...ctx, cacheCommonImages: (ids) => queued.push(ids) });
    const opened = await api.pack.open({ packId: pack.id });
    const result = await api.opening.get({ openingId: opened.openingId });
    expect(result.cards.map((c) => c.card.rarity)).toEqual([
      "common",
      "uncommon",
      "rare",
      "super_rare",
      "legendary",
    ]);
    expect(queued[0]?.sort()).toEqual(
      result.cards
        .filter((c) => ["common", "uncommon"].includes(c.card.rarity))
        .map((c) => c.card.id)
        .sort(),
    );
    const owned = await api.card.listOwned({ rarity: "uncommon" });
    expect(owned.cards).toHaveLength(1);
    expect(owned.cards[0]?.rarity).toBe("uncommon");
  } finally {
    await dispose();
  }
});
