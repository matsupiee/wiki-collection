import {
  rarityByThresholds,
  type RarityThresholds,
  thresholdsFromPageviews,
} from "@wiki-collection/db/rarity";

import { type CardRecord, readCardStore, writeGenreCards, writeThresholds } from "./card-store";
import { fetchCategoryPages } from "./fetch-category-pages";
import { fetchImageLicenses } from "./fetch-image-licenses";
import { fetchMonthlyPageviews } from "./fetch-monthly-pageviews";
import { fetchPageDetails } from "./fetch-page-details";
import { fetchSummary } from "./fetch-summary";
import { getExclusionReason } from "./get-exclusion-reason";
import type { WikimediaClient } from "./wikimedia-client";

// いまは日本語版だけを扱う
const LANG = "ja";

export type ImportGenre = { slug: string; name: string; sourceCategory: string };

type Candidate = Omit<CardRecord, "rarity">;

export type ImportResult = {
  inserted: { title: string; genreSlug: string; rarity: string; monthlyPageviews: number }[];
  excluded: { title: string; reason: string }[];
  // この取り込みでレアリティの下限を決めたときだけ入る
  createdThresholds: RarityThresholds | null;
};

// ジャンルのカテゴリから記事を集め、除外の条件に当たらないものをカードとして dataDir の JSONL に書き足す。
// すでにカードになっている記事は取り直さない。レアリティを作った時点で固定するため
export async function importCards(input: {
  client: WikimediaClient;
  // カードの JSONL とレアリティの下限を置くディレクトリ（card-store.ts）
  dataDir: string;
  genres: readonly ImportGenre[];
  // 省略するとすべてのジャンルを取り込む
  genreSlugs?: string[];
  // サブカテゴリをたどる深さ
  depth: number;
  // ジャンルごとに調べる記事の数の上限（除外する記事も含む）
  maxPagesPerGenre: number;
  now?: Date;
  log?: (message: string) => void;
}): Promise<ImportResult> {
  const { client, dataDir } = input;
  const now = input.now ?? new Date();
  const log = input.log ?? (() => {});

  const genres = input.genreSlugs
    ? input.genres.filter((g) => input.genreSlugs!.includes(g.slug))
    : input.genres;
  const missing = (input.genreSlugs ?? []).filter((slug) => !genres.some((g) => g.slug === slug));
  if (missing.length > 0) throw new Error(`ジャンルが見つかりません: ${missing.join(", ")}`);

  const store = await readCardStore(dataDir);
  const existingCards = [...store.cards.values()].flat();
  const seen = new Set(existingCards.map((c) => c.wikiPageId));

  const candidates: { genreSlug: string; value: Candidate }[] = [];
  const excluded: ImportResult["excluded"] = [];
  for (const g of genres) {
    log(`${g.name}: カテゴリ「${g.sourceCategory}」から記事を集めています`);
    const pages = (
      await fetchCategoryPages(client, {
        lang: LANG,
        category: g.sourceCategory,
        depth: input.depth,
        maxPages: input.maxPagesPerGenre,
      })
    ).filter((p) => !seen.has(p.pageId));
    for (const p of pages) seen.add(p.pageId);

    // 要約や閲覧数を取る前に、カテゴリとタイトルで外せる記事を外して、リクエストを減らす
    const details = await fetchPageDetails(client, {
      lang: LANG,
      pageIds: pages.map((p) => p.pageId),
    });
    const kept = [...details.values()].filter((d) => {
      const reason = getExclusionReason(d);
      if (reason) excluded.push({ title: d.title, reason });
      return !reason;
    });

    const images = await fetchImageLicenses(client, {
      lang: LANG,
      files: [...new Set(kept.flatMap((d) => (d.imageFile ? [d.imageFile] : [])))],
    });

    const fetched = await Promise.all(
      kept.map(async (d) => {
        const [summary, monthlyPageviews] = await Promise.all([
          fetchSummary(client, { lang: LANG, title: d.title }),
          fetchMonthlyPageviews(client, { lang: LANG, title: d.title, now }),
        ]);
        return { detail: d, summary, monthlyPageviews };
      }),
    );
    for (const { detail, summary, monthlyPageviews } of fetched) {
      if (!summary) {
        excluded.push({ title: detail.title, reason: "要約が取れない" });
        continue;
      }
      const reason =
        summary.type === "disambiguation"
          ? "曖昧さ回避"
          : getExclusionReason({ ...detail, extract: summary.extract });
      if (reason) {
        excluded.push({ title: detail.title, reason });
        continue;
      }
      const image = detail.imageFile ? images.get(detail.imageFile) : undefined;
      candidates.push({
        genreSlug: g.slug,
        value: {
          wikiPageId: detail.pageId,
          wikiRevisionId: summary.revisionId,
          wikiFetchedAt: now,
          title: detail.title,
          summary: summary.extract,
          imageUrl: image?.url ?? null,
          imageCredit: image?.credit ?? null,
          monthlyPageviews,
          pageviewsMeasuredAt: now,
          isActive: true,
        },
      });
    }
    log(`${g.name}: ${pages.length} 件を調べました`);
  }

  // レアリティの下限がまだなければ、いまあるカードとこの取り込みの記事の閲覧数の順位から決める
  const createdThresholds =
    store.thresholds || candidates.length === 0
      ? null
      : thresholdsFromPageviews([
          ...existingCards.map((c) => c.monthlyPageviews),
          ...candidates.map((c) => c.value.monthlyPageviews),
        ]);
  const thresholds = store.thresholds ?? createdThresholds;
  if (!thresholds) return { inserted: [], excluded, createdThresholds };

  const inserted: ImportResult["inserted"] = [];
  for (const g of genres) {
    const added = candidates
      .filter((c) => c.genreSlug === g.slug)
      .map(({ value }) => ({
        ...value,
        rarity: rarityByThresholds(value.monthlyPageviews, thresholds),
      }));
    if (added.length === 0) continue;
    await writeGenreCards(dataDir, g.slug, [...(store.cards.get(g.slug) ?? []), ...added]);
    inserted.push(
      ...added.map((c) => ({
        title: c.title,
        genreSlug: g.slug,
        rarity: c.rarity,
        monthlyPageviews: c.monthlyPageviews,
      })),
    );
  }

  // 下限とカードは同じコミットに入れる。片方だけ残ったら、git で戻してから取り込み直す
  if (createdThresholds) await writeThresholds(dataDir, createdThresholds);

  return { inserted, excluded, createdThresholds };
}
