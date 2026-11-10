import type { CardStore } from "../../../wiki-import/src/card-store";
import { mirrorImages, type ImageFetch } from "../../../wiki-import/src/mirror-images";
import { commonsImageUrl } from "../card-image";
import { type Rarity } from "../enums";
import { rarityByRank, thresholdsFromPageviews } from "../rarity";
import type { Database } from "../index";
import { card, genre, rarityThreshold, coinProduct } from "../schema";
import { coinProducts } from "./master-data";
import { seedPacks } from "./packs";
import { reset } from "./reset";

// 閲覧数順で100件選び、ローカル用の排出バランスを作る。
export function selectWikiCards(store: CardStore) {
  const known = new Set(store.genres.map((g) => g.slug));
  const seen = new Set<number>();
  const selected = [...store.cards]
    .sort((a, b) => b.monthlyPageviews - a.monthlyPageviews || a.wikiPageId - b.wikiPageId)
    .filter((c) => {
      if (
        !c.isActive ||
        !c.imageUrl ||
        !commonsImageUrl(c.imageUrl) ||
        !c.imageCredit?.trim() ||
        !known.has(c.genre) ||
        seen.has(c.wikiPageId)
      )
        return false;
      seen.add(c.wikiPageId);
      return true;
    })
    .slice(0, 100);
  if (selected.length !== 100)
    throw new Error("画像付きカードが100件必要です。DBは初期化していません。");
  return selected.map((c, rank) => ({ ...c, rarity: rarityByRank(rank, selected.length) }));
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
  await reset(db);
  // 先頭ページを繰り返し削除する。削除後のカーソルに依存しない。
  for (;;) {
    const page = await images.list({ limit: 1000 });
    if (!page.objects.length) break;
    await images.delete(page.objects.map((o) => o.key));
  }
  const result = await mirrorImages({
    cards: selected,
    storage: {
      exists: async (key) => (await images.head(key)) !== null,
      put: async (key, bytes, contentType) => {
        await images.put(key, bytes, { httpMetadata: { contentType } });
      },
    },
    limit: 100,
    fetch: input.fetch,
    sleep: input.sleep,
    log: input.log,
  });
  if (result.failed || result.skipped)
    throw new Error(
      `画像保存に失敗しました (${result.failed}件失敗、${result.skipped}件対象外)。DBは空です。再実行してください。`,
    );
  const used = new Set(selected.map((c) => c.genre));
  const genreIds = new Map<string, string>();
  for (const g of store.genres.filter((g) => used.has(g.slug))) {
    const [row] = await db.insert(genre).values(g).returning();
    genreIds.set(g.slug, row!.id);
  }
  for (const { genre: slug, ...c } of selected) {
    await db.insert(card).values({ ...c, wikiLang: "ja", genreId: genreIds.get(slug)! });
  }
  {
    const thresholds = thresholdsFromPageviews(selected.map((c) => c.monthlyPageviews));
    await db.insert(rarityThreshold).values(
      Object.entries(thresholds).map(([rarity, minMonthlyPageviews]) => ({
        wikiLang: "ja",
        rarity: rarity as Rarity,
        minMonthlyPageviews,
      })),
    );
  }
  await seedPacks(db);
  await db.insert(coinProduct).values(coinProducts);
  return { cards: selected.length, images: result.uploaded + result.existing };
}
