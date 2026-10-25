import type { Database } from "@wiki-collection/db";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { sql } from "drizzle-orm";

import { readCardStore } from "./card-store";

// いまは日本語版だけを扱う
const LANG = "ja";
// D1 は1文あたりのバインド変数が 100 個までなので、card は数件ずつ入れる
const INSERT_CHUNK = 6;

export type LoadResult = { cards: number; thresholds: boolean };

// git で管理しているカードの JSONL とレアリティの下限を D1 に入れる。何度実行しても同じ状態になる。
// すでにある記事は isActive だけを揃える。要約やレアリティは作った時点で固定するため
export async function loadCards(input: { db: Database; dataDir: string }): Promise<LoadResult> {
  const { db } = input;
  const store = await readCardStore(input.dataDir);

  const genres = await db.select({ id: genre.id, slug: genre.slug }).from(genre);
  const genreIdBySlug = new Map(genres.map((g) => [g.slug, g.id]));
  const missing = [...store.cards.keys()].filter((slug) => !genreIdBySlug.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `D1 にジャンルがありません（先に bun run db:seed を実行する）: ${missing.join(", ")}`,
    );
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
  const values = [...store.cards].flatMap(([slug, records]) =>
    records.map((r) => ({ ...r, wikiLang: LANG, genreId: genreIdBySlug.get(slug)! })),
  );
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    statements.push(
      db
        .insert(card)
        .values(values.slice(i, i + INSERT_CHUNK))
        .onConflictDoUpdate({
          target: [card.wikiLang, card.wikiPageId],
          set: { isActive: sql`excluded.is_active` },
        }),
    );
  }
  // 下限とカードを同時に書く。途中で失敗して、片方だけが入らないようにするため
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return { cards: values.length, thresholds: store.thresholds !== null };
}
