import type { Database } from "@wiki-collection/db";
import {
  rarityByThresholds,
  type RarityThresholds,
  thresholdsFromPageviews,
} from "@wiki-collection/db/rarity";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { eq, inArray } from "drizzle-orm";

import { fetchCategoryPages } from "./fetch-category-pages";
import { fetchImageLicenses } from "./fetch-image-licenses";
import { fetchMonthlyPageviews } from "./fetch-monthly-pageviews";
import { fetchPageDetails } from "./fetch-page-details";
import { fetchSummary } from "./fetch-summary";
import { getExclusionReason } from "./get-exclusion-reason";
import type { WikimediaClient } from "./wikimedia-client";

// いまは日本語版だけを扱う
const LANG = "ja";
// D1 は1文あたりのバインド変数が 100 個までなので、card は数件ずつ入れる
const INSERT_CHUNK = 6;

type Candidate = Omit<typeof card.$inferInsert, "rarity">;

export type ImportResult = {
  inserted: { title: string; genreSlug: string; rarity: string; monthlyPageviews: number }[];
  excluded: { title: string; reason: string }[];
  // この取り込みでレアリティの下限を決めたときだけ入る
  createdThresholds: RarityThresholds | null;
};

// ジャンルのカテゴリから記事を集め、除外の条件に当たらないものをカードとして保存する。
// すでにカードになっている記事は取り直さない。レアリティを作った時点で固定するため
export async function importCards(input: {
  db: Database;
  client: WikimediaClient;
  // 省略するとすべてのジャンルを取り込む
  genreSlugs?: string[];
  // サブカテゴリをたどる深さ
  depth: number;
  // ジャンルごとに調べる記事の数の上限（除外する記事も含む）
  maxPagesPerGenre: number;
  now?: Date;
  log?: (message: string) => void;
}): Promise<ImportResult> {
  const { db, client } = input;
  const now = input.now ?? new Date();
  const log = input.log ?? (() => {});

  const genres = await db
    .select()
    .from(genre)
    .where(input.genreSlugs ? inArray(genre.slug, input.genreSlugs) : undefined);
  const missing = (input.genreSlugs ?? []).filter((slug) => !genres.some((g) => g.slug === slug));
  if (missing.length > 0) throw new Error(`ジャンルが見つかりません: ${missing.join(", ")}`);

  const existingCards = await db
    .select({ wikiPageId: card.wikiPageId, monthlyPageviews: card.monthlyPageviews })
    .from(card)
    .where(eq(card.wikiLang, LANG));
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
          wikiLang: LANG,
          wikiPageId: detail.pageId,
          wikiRevisionId: summary.revisionId,
          wikiFetchedAt: now,
          title: detail.title,
          summary: summary.extract,
          imageUrl: image?.url ?? null,
          imageCredit: image?.credit ?? null,
          genreId: g.id,
          monthlyPageviews,
          pageviewsMeasuredAt: now,
        },
      });
    }
    log(`${g.name}: ${pages.length} 件を調べました`);
  }

  // レアリティの下限がまだなければ、いまあるカードとこの取り込みの記事の閲覧数の順位から決める
  const thresholdRows = await db
    .select()
    .from(rarityThreshold)
    .where(eq(rarityThreshold.wikiLang, LANG));
  let thresholds: RarityThresholds;
  let createdThresholds: RarityThresholds | null = null;
  if (thresholdRows.length > 0) {
    thresholds = Object.fromEntries(
      thresholdRows.map((r) => [r.rarity, r.minMonthlyPageviews]),
    ) as RarityThresholds;
  } else {
    if (candidates.length === 0) return { inserted: [], excluded, createdThresholds };
    thresholds = thresholdsFromPageviews([
      ...existingCards.map((c) => c.monthlyPageviews),
      ...candidates.map((c) => c.value.monthlyPageviews),
    ]);
    createdThresholds = thresholds;
  }

  const values = candidates.map(({ value }) => ({
    ...value,
    rarity: rarityByThresholds(value.monthlyPageviews, thresholds),
  }));
  // 下限とカードを同時に書く。途中で失敗して、下限だけ・カードだけが残らないようにするため
  const statements = [];
  if (createdThresholds) {
    statements.push(
      db.insert(rarityThreshold).values(
        Object.entries(createdThresholds).map(([rarity, minMonthlyPageviews]) => ({
          wikiLang: LANG,
          rarity: rarity as keyof RarityThresholds,
          minMonthlyPageviews,
        })),
      ),
    );
  }
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    statements.push(
      db
        .insert(card)
        .values(values.slice(i, i + INSERT_CHUNK))
        .onConflictDoNothing(),
    );
  }
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return {
    inserted: values.map((v, i) => ({
      title: v.title,
      genreSlug: candidates[i]!.genreSlug,
      rarity: v.rarity,
      monthlyPageviews: v.monthlyPageviews,
    })),
    excluded,
    createdThresholds,
  };
}
