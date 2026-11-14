import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { packSlotRate } from "@wiki-collection/db/schema/index";
import { rarities } from "@wiki-collection/db/enums";
import { seedPacks } from "@wiki-collection/db/seed/packs";
import { createTestDb } from "./create-test-db";
import { createCard, createGenre } from "./fixtures";
import { drawPackCards } from "../shared/pack/draw-pack-cards";

test("枠別の排出率を移行し、抽選境界と確定枠を守る", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const packs = await seedPacks(db);
    const genre = await createGenre(db);
    for (const rarity of rarities) await createCard(db, { genreId: genre.id, rarity });
    const snapshot = async () =>
      (await db.select().from(packSlotRate))
        .map(({ packId, slot, rarity, weight }) => ({ packId, slot, rarity, weight }))
        .sort((a, b) =>
          `${a.packId}:${a.slot}:${a.rarity}`.localeCompare(`${b.packId}:${b.slot}:${b.rarity}`),
        );
    const seeded = await snapshot();
    await db.update(packSlotRate).set({ weight: 1 });
    const migration = await Bun.file(
      new URL(
        "../../../db/src/migrations/20261114034308_update_pack_slot_rates/migration.sql",
        import.meta.url,
      ),
    ).text();
    for (let i = 0; i < 2; i++) {
      for (const statement of migration.split("--> statement-breakpoint"))
        await db.run(sql.raw(statement));
      expect(await snapshot()).toEqual(seeded);
    }
    const expected = [
      [8000, 2000, 0, 0, 0],
      [8000, 2000, 0, 0, 0],
      [6000, 3000, 1000, 0, 0],
      [6000, 3000, 1000, 0, 0],
      [4800, 3000, 2000, 150, 50],
    ];
    for (const pack of packs) {
      const weights = expected.map((r) => [...r]);
      if (pack.slug === "double-rare-guaranteed") weights[4] = [0, 0, 0, 10000, 0];
      if (pack.slug === "legend-guaranteed") weights[4] = [0, 0, 0, 0, 10000];
      for (let slot = 0; slot < 5; slot++) {
        const rows = seeded.filter((r) => r.packId === pack.id && r.slot === slot + 1);
        expect(
          rarities.map((rarity) => rows.find((r) => r.rarity === rarity)?.weight ?? 0),
        ).toEqual(weights[slot]!);
        let lower = 0;
        for (let r = 0; r < rarities.length; r++) {
          const weight = weights[slot]![r]!;
          if (!weight) continue;
          for (const random of [lower / 10000, (lower + weight - 0.001) / 10000]) {
            // 対象枠の乱数だけを境界値にし、先行枠と候補選択には0を返す。
            let call = 0;
            const drawn = await drawPackCards(db, { ...pack, cardsPerPack: slot + 1 }, () => {
              const current = call++;
              return current === slot * 2 ? random : 0;
            });
            const expectedRarities = [...Array(slot).fill("common"), rarities[r]].sort(
              (a, b) => rarities.indexOf(a) - rarities.indexOf(b),
            );
            expect(drawn.map((c) => c.rarity)).toEqual(expectedRarities);
          }
          lower += weight;
        }
      }
    }
  } finally {
    await dispose();
  }
});
