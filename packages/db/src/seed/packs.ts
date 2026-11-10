import { and, eq, isNotNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "../index";
import type { Rarity } from "../enums";
import { pack, packSlotRate } from "../schema";
import { basicRates } from "./master-data";

const guaranteedPacks = [
  {
    slug: "double-rare-guaranteed",
    name: "SR1枚確定ガチャ",
    description: "5枚のうち1枚はSR確定。",
    priceCoins: 100,
    colorHex: "#4f46e5",
    guaranteedRarity: "super_rare",
  },
  {
    slug: "legend-guaranteed",
    name: "レジェンド1枚確定ガチャ",
    description: "5枚のうち1枚はレジェンド確定。",
    priceCoins: 500,
    colorHex: "#b45309",
    guaranteedRarity: "legendary",
  },
] as const;

function slotRows(packId: string, rates: Partial<Record<Rarity, number>>[]) {
  return rates.flatMap((weights, index) =>
    Object.entries(weights)
      .filter(([, weight]) => weight > 0)
      .map(([rarity, weight]) => ({
        packId,
        slot: index + 1,
        rarity: rarity as Rarity,
        weight,
      })),
  );
}

export async function syncGuaranteedPacks(db: Database) {
  const retireGenres = db
    .update(pack)
    .set({ isActive: false })
    .where(and(eq(pack.type, "premium"), isNotNull(pack.genreId), eq(pack.isActive, true)));
  const queries: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [retireGenres];
  for (const [index, { guaranteedRarity, ...definition }] of guaranteedPacks.entries()) {
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
        .values(slotRows(id, [...basicRates.slice(0, 4), { [guaranteedRarity]: 10000 }])),
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
  await db.insert(packSlotRate).values(slotRows(basic!.id, basicRates));
  await syncGuaranteedPacks(db);
  return db.select().from(pack).where(eq(pack.isActive, true));
}
