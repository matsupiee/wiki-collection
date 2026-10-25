import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { rarities } from "@wiki-collection/db/enums";
import type { RarityThresholds } from "@wiki-collection/db/rarity";
import { z } from "zod";

// 取り込んだカードは git で管理する。D1 へは load-cards.ts で入れる。
// - cards/{page_id を 10 万で割った数}.jsonl: 1行1カード。1ファイルが大きくなりすぎないよう、page_id で分ける
// - genres.jsonl: ジャンル（Wikidata の分類）
// - excluded.jsonl: カードにしなかった記事と理由。次の取り込みで取り直さないため
// - rarity-thresholds.json: レアリティの下限
export const DATA_DIR = path.resolve(import.meta.dirname, "../data/ja");

const CARDS_DIR = "cards";
const GENRES_FILE = "genres.jsonl";
const EXCLUDED_FILE = "excluded.jsonl";
const THRESHOLDS_FILE = "rarity-thresholds.json";
const PAGES_PER_SHARD = 100_000;

const date = z.iso.datetime().transform((s) => new Date(s));

const cardRecordSchema = z.object({
  wikiPageId: z.number().int(),
  title: z.string(),
  // ジャンルの slug（Wikidata の ID）
  genre: z.string(),
  wikiRevisionId: z.number().int(),
  wikiFetchedAt: date,
  summary: z.string(),
  imageUrl: z.string().nullable(),
  imageCredit: z.string().nullable(),
  rarity: z.enum(rarities),
  monthlyPageviews: z.number().int(),
  pageviewsMeasuredAt: date,
  // 排出を止めるときは false に書き換えて、wiki:load で D1 に反映する
  isActive: z.boolean(),
});
export type CardRecord = z.output<typeof cardRecordSchema>;

const genreRecordSchema = z.object({
  slug: z.string(),
  name: z.string(),
  colorHex: z.string().regex(/^#[0-9a-f]{6}$/),
});
export type GenreRecord = z.output<typeof genreRecordSchema>;

const excludedRecordSchema = z.object({
  wikiPageId: z.number().int(),
  title: z.string(),
  reason: z.string(),
});
export type ExcludedRecord = z.output<typeof excludedRecordSchema>;

const thresholdsSchema = z.object({
  legendary: z.number().int(),
  double_rare: z.number().int(),
  rare: z.number().int(),
  uncommon: z.number().int(),
});

export type CardStore = {
  cards: CardRecord[];
  genres: GenreRecord[];
  excluded: ExcludedRecord[];
  thresholds: RarityThresholds | null;
};

async function readJsonl<T>(dir: string, file: string, schema: z.ZodType<T>): Promise<T[]> {
  const text = await readFile(path.join(dir, file), "utf8").catch(() => null);
  if (text === null) return [];
  return text.split("\n").flatMap((line, i) => {
    if (line.trim() === "") return [];
    try {
      return [schema.parse(JSON.parse(line))];
    } catch (error) {
      throw new Error(`${file} の ${i + 1} 行目が読めません: ${String(error)}`);
    }
  });
}

async function writeJsonl(dir: string, file: string, rows: unknown[]) {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), rows.map((r) => `${JSON.stringify(r)}\n`).join(""));
}

export async function readCardStore(dir: string): Promise<CardStore> {
  const shards = (await readdir(path.join(dir, CARDS_DIR)).catch(() => []))
    .filter((f) => f.endsWith(".jsonl"))
    .sort();
  const cards: CardRecord[] = [];
  for (const shard of shards) {
    cards.push(...(await readJsonl(dir, `${CARDS_DIR}/${shard}`, cardRecordSchema)));
  }
  const thresholdsText = await readFile(path.join(dir, THRESHOLDS_FILE), "utf8").catch(() => null);
  return {
    cards,
    genres: await readJsonl(dir, GENRES_FILE, genreRecordSchema),
    excluded: await readJsonl(dir, EXCLUDED_FILE, excludedRecordSchema),
    thresholds: thresholdsText ? thresholdsSchema.parse(JSON.parse(thresholdsText)) : null,
  };
}

function shardOf(wikiPageId: number) {
  return `${CARDS_DIR}/${String(Math.floor(wikiPageId / PAGES_PER_SHARD)).padStart(3, "0")}.jsonl`;
}

// added のカードが入るファイルだけを、page_id 順で書き直す。差分が追加した行だけになるようにするため
export async function writeCards(dir: string, all: CardRecord[], added: CardRecord[]) {
  const touched = new Set(added.map((c) => shardOf(c.wikiPageId)));
  for (const shard of touched) {
    const rows = all
      .filter((c) => shardOf(c.wikiPageId) === shard)
      .sort((a, b) => a.wikiPageId - b.wikiPageId)
      // キーの順番を固定する
      .map((c) => ({
        wikiPageId: c.wikiPageId,
        title: c.title,
        genre: c.genre,
        wikiRevisionId: c.wikiRevisionId,
        wikiFetchedAt: c.wikiFetchedAt.toISOString(),
        summary: c.summary,
        imageUrl: c.imageUrl,
        imageCredit: c.imageCredit,
        rarity: c.rarity,
        monthlyPageviews: c.monthlyPageviews,
        pageviewsMeasuredAt: c.pageviewsMeasuredAt.toISOString(),
        isActive: c.isActive,
      }));
    await writeJsonl(dir, shard, rows);
  }
}

// Wikidata の ID の数字順に並べる
const byQid = (slug: string) => Number(slug.replace(/^\D+/, "")) || 0;

export async function writeGenres(dir: string, genres: GenreRecord[]) {
  const rows = [...genres]
    .sort((a, b) => byQid(a.slug) - byQid(b.slug) || a.slug.localeCompare(b.slug))
    .map((g) => ({ slug: g.slug, name: g.name, colorHex: g.colorHex }));
  await writeJsonl(dir, GENRES_FILE, rows);
}

export async function writeExcluded(dir: string, excluded: ExcludedRecord[]) {
  const rows = [...excluded]
    .sort((a, b) => a.wikiPageId - b.wikiPageId)
    .map((e) => ({ wikiPageId: e.wikiPageId, title: e.title, reason: e.reason }));
  await writeJsonl(dir, EXCLUDED_FILE, rows);
}

export async function writeThresholds(dir: string, thresholds: RarityThresholds) {
  await mkdir(dir, { recursive: true });
  const ordered = {
    legendary: thresholds.legendary,
    double_rare: thresholds.double_rare,
    rare: thresholds.rare,
    uncommon: thresholds.uncommon,
  };
  await writeFile(path.join(dir, THRESHOLDS_FILE), `${JSON.stringify(ordered, null, 2)}\n`);
}
