import type { Database } from "@wiki-collection/db";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { inArray, sql } from "drizzle-orm";

import { readCardStore } from "./card-store";

// いまは日本語版だけを扱う
const LANG = "ja";
// D1 は1文あたりのバインド変数が 100 個までなので、数件ずつ入れる
const CARD_CHUNK = 6;
const GENRE_CHUNK = 15;
// 1回の batch に入れる文の数。カードが 10 万枚あると1回では大きすぎるため分ける。
// 何度実行しても同じ状態になるので、途中で失敗したらやり直せばよい
const STATEMENTS_PER_BATCH = 500;

export type LoadResult = { genres: number; cards: number; thresholds: boolean };

// git で管理しているジャンル、カード、レアリティの下限を D1 に入れる。何度実行しても同じ状態になる。
// すでにある記事は isActive だけを揃える。要約、ジャンル、レアリティは作った時点で固定するため
export async function loadCards(input: { db: Database; dataDir: string }): Promise<LoadResult> {
  const { db } = input;
  const store = await readCardStore(input.dataDir);

  const known = new Set(store.genres.map((g) => g.slug));
  const unknown = [...new Set(store.cards.map((c) => c.genre))].filter((s) => !known.has(s));
  if (unknown.length > 0) {
    throw new Error(`genres.jsonl にないジャンルのカードがあります: ${unknown.join(", ")}`);
  }

  // カードの多いジャンルから並べる
  const counts = new Map<string, number>();
  for (const c of store.cards) counts.set(c.genre, (counts.get(c.genre) ?? 0) + 1);
  const genreValues = [...store.genres]
    .sort(
      (a, b) =>
        (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0) || a.slug.localeCompare(b.slug),
    )
    .map((g, i) => ({ slug: g.slug, name: g.name, colorHex: g.colorHex, sortOrder: i }));
  const genreStatements = [];
  for (let i = 0; i < genreValues.length; i += GENRE_CHUNK) {
    genreStatements.push(
      db
        .insert(genre)
        .values(genreValues.slice(i, i + GENRE_CHUNK))
        .onConflictDoUpdate({
          target: genre.slug,
          set: {
            name: sql`excluded.name`,
            colorHex: sql`excluded.color_hex`,
            sortOrder: sql`excluded.sort_order`,
          },
        }),
    );
  }
  await runBatches(db, genreStatements);

  const genreIdBySlug = new Map<string, string>();
  const slugs = genreValues.map((g) => g.slug);
  for (let i = 0; i < slugs.length; i += 90) {
    const rows = await db
      .select({ id: genre.id, slug: genre.slug })
      .from(genre)
      .where(inArray(genre.slug, slugs.slice(i, i + 90)));
    for (const r of rows) genreIdBySlug.set(r.slug, r.id);
  }

  const statements = [];
  if (store.thresholds) {
    statements.push(
      db
        .insert(rarityThreshold)
        .values(
          Object.entries(store.thresholds).map(([rarity, minMonthlyPageviews]) => ({
            wikiLang: LANG,
            rarity: rarity as keyof typeof store.thresholds,
            minMonthlyPageviews,
          })),
        )
        .onConflictDoUpdate({
          target: [rarityThreshold.wikiLang, rarityThreshold.rarity],
          set: { minMonthlyPageviews: sql`excluded.min_monthly_pageviews` },
        }),
    );
  }
  const cardValues = store.cards.map(({ genre: slug, ...c }) => ({
    ...c,
    wikiLang: LANG,
    genreId: genreIdBySlug.get(slug)!,
  }));
  for (let i = 0; i < cardValues.length; i += CARD_CHUNK) {
    statements.push(
      db
        .insert(card)
        .values(cardValues.slice(i, i + CARD_CHUNK))
        .onConflictDoUpdate({
          target: [card.wikiLang, card.wikiPageId],
          set: { isActive: sql`excluded.is_active` },
        }),
    );
  }
  await runBatches(db, statements);

  return {
    genres: genreValues.length,
    cards: cardValues.length,
    thresholds: store.thresholds !== null,
  };
}

async function runBatches(db: Database, statements: Parameters<Database["batch"]>[0][number][]) {
  for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
    const [first, ...rest] = statements.slice(i, i + STATEMENTS_PER_BATCH);
    if (first) await db.batch([first, ...rest]);
  }
}
