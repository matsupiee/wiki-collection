import { createId } from "@paralleldrive/cuid2";
import { createReadStream } from "node:fs";
import type { GenreRecord } from "../../../wiki-import/src/card-store";
import { dumpArticleSchema, type DumpArticle } from "../../../wiki-import/src/dump-article";
import { importChunk } from "../../../wiki-import/src/import-cards";
import { readLines } from "../../../wiki-import/src/read-lines";
import { createWikimediaClient } from "../../../wiki-import/src/wikimedia-client";
import { rarityThresholds } from "../rarity";

// D1のSQL文上限は100 KB。複数行を1文にまとめ、ファイル単位でWranglerに渡す。
const statementBytes = 96_000;
const fileBytes = 16 * 1024 * 1024;

function literal(value: string | number | null | undefined): string {
  if (value == null) return "NULL";
  if (typeof value === "number") return String(value);
  // import用SQLの各文は1行に収め、改行やNULを含むテキストも保持する。
  if (/[\r\n\0]/.test(value))
    return `json_extract('${JSON.stringify(value).replaceAll("'", "''")}','$')`;
  return `'${value.replaceAll("'", "''")}'`;
}

function* insertRows(table: string, columns: string, rows: Iterable<string>, conflict: string) {
  const prefix = `INSERT INTO ${table} (${columns}) VALUES `;
  const suffix = ` ON CONFLICT ${conflict};\n`;
  let batch: string[] = [];
  const overhead = Buffer.byteLength(prefix + suffix);
  let bytes = overhead;
  for (const row of rows) {
    const size = Buffer.byteLength(row) + 1;
    if (overhead + size > statementBytes)
      throw new Error(`${table} の1行がD1のSQL文上限を超えます`);
    if (bytes + size > statementBytes) {
      yield prefix + batch.join(",") + suffix;
      batch = [];
      bytes = overhead;
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length) yield prefix + batch.join(",") + suffix;
}

export async function seedLocalDump(input: string, executeFile: (sql: string) => Promise<void>) {
  const client = createWikimediaClient();
  const now = new Date();
  const knownGenres = new Map<string, GenreRecord>();
  let pages: DumpArticle[] = [];
  let articles = 0;
  let cards = 0;
  let files = 0;
  let sql = "";
  let bytes = 0;
  async function flush() {
    await executeFile(sql);
    files++;
    console.log(`D1への投入完了: ${files} ファイル`);
    bytes = 0;
    sql = "";
  }
  async function append(statements: Iterable<string>) {
    for (const statement of statements) {
      const size = Buffer.byteLength(statement);
      if (bytes + size > fileBytes) await flush();
      bytes += size;
      sql += statement;
    }
  }
  async function convert() {
    const part = await importChunk(client, { pages, genres: knownGenres, now });
    await append(
      insertRows(
        "genre",
        "id,slug,name,color_hex",
        part.newGenres.map(
          (g) => `(${[createId(), g.slug, g.name, g.colorHex].map(literal).join(",")})`,
        ),
        "(slug) DO NOTHING",
      ),
    );
    for (const g of part.newGenres) knownGenres.set(g.slug, g);
    await append(
      insertRows(
        "card",
        "id,wiki_lang,wiki_page_id,title,wiki_revision_id,wiki_fetched_at,summary,image_url,image_credit,rarity,article_length,monthly_pageviews,pageviews_measured_at,genre_id",
        part.cards.map((c) => {
          const values = [
            createId(),
            "ja",
            c.wikiPageId,
            c.title,
            c.wikiRevisionId,
            now.getTime(),
            c.summary,
            c.imageUrl,
            c.imageCredit,
            c.rarity,
            c.articleLength,
            c.monthlyPageviews,
            now.getTime(),
          ];
          return `(${values.map(literal).join(",")},(SELECT id FROM genre WHERE slug=${literal(c.genre)}))`;
        }),
        "(wiki_lang,wiki_page_id) DO UPDATE SET article_length=excluded.article_length WHERE card.article_length IS NULL AND excluded.article_length IS NOT NULL",
      ),
    );
    cards += part.cards.length;
    pages = [];
  }
  await append(
    insertRows(
      "rarity_threshold",
      "id,wiki_lang,rarity,min_monthly_pageviews",
      Object.entries(rarityThresholds).map(
        ([rarity, views]) => `(${[createId(), "ja", rarity, views].map(literal).join(",")})`,
      ),
      "(wiki_lang,rarity) DO UPDATE SET min_monthly_pageviews=excluded.min_monthly_pageviews",
    ),
  );
  for await (const line of readLines(createReadStream(input))) {
    articles++;
    try {
      pages.push(dumpArticleSchema.parse(JSON.parse(line)));
    } catch (error) {
      throw new Error(`${input} の ${articles} 行目を読み込めません`, { cause: error });
    }
    if (pages.length === 500) await convert();
  }
  if (!articles) throw new Error("記事ファイルが空です");
  if (pages.length) await convert();
  await append([
    `WITH totals AS (SELECT g.id, row_number() OVER (ORDER BY count(c.genre_id) DESC, g.slug) - 1 AS position FROM genre g LEFT JOIN card c ON c.genre_id=g.id GROUP BY g.id) UPDATE genre SET sort_order=totals.position FROM totals WHERE genre.id=totals.id;\n`,
  ]);
  await flush();
  return { articles, cards, files };
}
