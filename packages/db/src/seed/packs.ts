import { and, eq, isNotNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "../index";
import type { Rarity } from "../enums";
import { pack, packSlotRate } from "../schema";
import { basicRates } from "./master-data";

const guaranteedPacks = [
  {
    slug: "double-rare-guaranteed",
    name: "ダブルレア確定ガチャ",
    description: "5枚すべてダブルレア以上。",
    priceCoins: 100,
    colorHex: "#4f46e5",
    rates: [
      { rarity: "double_rare", weight: 9900 },
      { rarity: "legendary", weight: 100 },
    ],
  },
  {
    slug: "legend-guaranteed",
    name: "レジェンド確定ガチャ",
    description: "5枚すべてレジェンド。",
    priceCoins: 500,
    colorHex: "#b45309",
    rates: [{ rarity: "legendary", weight: 10000 }],
  },
] as const;

export async function syncGuaranteedPacks(db: Database) {
  const retireGenres = db
    .update(pack)
    .set({ isActive: false })
    .where(and(eq(pack.type, "premium"), isNotNull(pack.genreId), eq(pack.isActive, true)));
  const queries: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [retireGenres];
  for (const [index, { rates, ...definition }] of guaranteedPacks.entries()) {
    const values = { ...definition, type: "premium" as const, sortOrder: index + 1 };
    const id = definition.slug;
    queries.push(
      db
        .insert(pack)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: pack.id, set: values }),
      db.delete(packSlotRate).where(eq(packSlotRate.packId, id)),
      db
        .insert(packSlotRate)
        .values(
          [1, 2, 3, 4, 5].flatMap((slot) => rates.map((rate) => ({ ...rate, packId: id, slot }))),
        ),
    );
  }
  await db.batch(queries);
}

export async function seedPacks(db: Database) {
  const [basic] = await db
    .insert(pack)
    .values({
      slug: "basic",
      name: "基本パック",
      description: "すべてのジャンルのカードが出る無料パック。",
      type: "free_basic",
      colorHex: "#7c3aed",
    })
    .returning();
  await db.insert(packSlotRate).values(
    basicRates.flatMap((weights, index) =>
      Object.entries(weights)
        .filter(([, weight]) => weight > 0)
        .map(([rarity, weight]) => ({
          packId: basic!.id,
          slot: index + 1,
          rarity: rarity as Rarity,
          weight,
        })),
    ),
  );
  await syncGuaranteedPacks(db);
  return db.select().from(pack).where(eq(pack.isActive, true));
}
