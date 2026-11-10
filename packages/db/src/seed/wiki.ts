import type { CardStore } from "../../../wiki-import/src/card-store";
import { mirrorImages, type ImageFetch } from "../../../wiki-import/src/mirror-images";
import { type Rarity } from "../enums";
import { rarityThresholds } from "../rarity";
import type { Database } from "../index";
import { card, genre, rarityThreshold, coinProduct } from "../schema";
import { coinProducts } from "./master-data";
import { seedPacks } from "./packs";
import { reset } from "./reset";

export function selectWikiCards(store: CardStore) {
  const known = new Set(store.genres.map((g) => g.slug));
  const quotas = { common: 325, rare: 100, super_rare: 50, legendary: 25 };
  const seen = new Set<number>();
  const selected = store.cards.filter((c) => {
    if (!c.isActive || !known.has(c.genre) || !quotas[c.rarity] || seen.has(c.wikiPageId))
      return false;
    seen.add(c.wikiPageId);
    quotas[c.rarity]--;
    return true;
  });
  if (selected.length !== 500)
    throw new Error("各レアリティのカードが不足しています。DBは初期化していません。");
  return selected;
}

export async function seedWiki(input: {
  db: Database;
  images: R2Bucket;
  store: CardStore;
  fetch?: ImageFetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}) {
  const { db, images, store } = input;
  const selected = selectWikiCards(store);
  const result = await mirrorImages({
    cards: selected.filter((c) => c.rarity !== "common"),
    storage: {
      exists: async (key) => (await images.head(key)) !== null,
      put: async (key, bytes, contentType) => {
        await images.put(key, bytes, { httpMetadata: { contentType } });
      },
    },
    limit: selected.length,
    fetch: input.fetch,
    sleep: input.sleep,
    log: input.log,
  });
  if (result.failed)
    throw new Error(
      `画像保存に失敗しました (${result.failed}件失敗、${result.skipped}件対象外)。DBは初期化していません。再実行してください。`,
    );
  await reset(db);
  const used = new Set(selected.map((c) => c.genre));
  const genreIds = new Map<string, string>();
  for (const g of store.genres.filter((g) => used.has(g.slug))) {
    const [row] = await db.insert(genre).values(g).returning();
    genreIds.set(g.slug, row!.id);
  }
  for (const { genre: slug, ...c } of selected) {
    await db.insert(card).values({ ...c, wikiLang: "ja", genreId: genreIds.get(slug)! });
  }
  await db.insert(rarityThreshold).values(
    Object.entries(rarityThresholds).map(([rarity, minMonthlyPageviews]) => ({
      wikiLang: "ja",
      rarity: rarity as Rarity,
      minMonthlyPageviews,
    })),
  );
  await seedPacks(db);
  await db.insert(coinProduct).values(coinProducts);
  return { cards: selected.length, images: result.uploaded + result.existing };
}
