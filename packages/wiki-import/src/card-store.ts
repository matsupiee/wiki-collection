import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { rarities } from "@wiki-collection/db/enums";
import type { RarityThresholds } from "@wiki-collection/db/rarity";
import { z } from "zod";

// 取り込んだカードは git で管理する。ジャンルごとに cards/{slug}.jsonl へ1行1カードで書き、
// レアリティの下限は rarity-thresholds.json に置く。D1 へは load-cards.ts で入れる
export const DATA_DIR = path.resolve(import.meta.dirname, "../data/ja");

const THRESHOLDS_FILE = "rarity-thresholds.json";
const CARDS_DIR = "cards";

const cardRecordSchema = z.object({
  wikiPageId: z.number().int(),
  title: z.string(),
  wikiRevisionId: z.number().int(),
  wikiFetchedAt: z.iso.datetime().transform((s) => new Date(s)),
  summary: z.string(),
  imageUrl: z.string().nullable(),
  imageCredit: z.string().nullable(),
  rarity: z.enum(rarities),
  monthlyPageviews: z.number().int(),
  pageviewsMeasuredAt: z.iso.datetime().transform((s) => new Date(s)),
  // 排出を止めるときは false に書き換えて、wiki:load で D1 に反映する
  isActive: z.boolean(),
});

export type CardRecord = z.output<typeof cardRecordSchema>;

const thresholdsSchema = z.object({
  legendary: z.number().int(),
  double_rare: z.number().int(),
  rare: z.number().int(),
  uncommon: z.number().int(),
});

export type CardStore = {
  // ジャンルの slug → そのジャンルのカード
  cards: Map<string, CardRecord[]>;
  thresholds: RarityThresholds | null;
};

export async function readCardStore(dir: string): Promise<CardStore> {
  const cards = new Map<string, CardRecord[]>();
  const cardsDir = path.join(dir, CARDS_DIR);
  const files = (await readdir(cardsDir).catch(() => [])).filter((f) => f.endsWith(".jsonl"));
  for (const file of files.sort()) {
    const lines = (await readFile(path.join(cardsDir, file), "utf8")).split("\n");
    const records = lines.flatMap((line, i) => {
      if (line.trim() === "") return [];
      try {
        return [cardRecordSchema.parse(JSON.parse(line))];
      } catch (error) {
        throw new Error(`${CARDS_DIR}/${file} の ${i + 1} 行目が読めません: ${String(error)}`);
      }
    });
    cards.set(path.basename(file, ".jsonl"), records);
  }

  const thresholdsText = await readFile(path.join(dir, THRESHOLDS_FILE), "utf8").catch(() => null);
  const thresholds = thresholdsText ? thresholdsSchema.parse(JSON.parse(thresholdsText)) : null;
  return { cards, thresholds };
}

// ジャンルのファイルを page_id 順で書き直す。差分が追加した行だけになるようにするため
export async function writeGenreCards(dir: string, genreSlug: string, records: CardRecord[]) {
  const cardsDir = path.join(dir, CARDS_DIR);
  await mkdir(cardsDir, { recursive: true });
  const lines = [...records]
    .sort((a, b) => a.wikiPageId - b.wikiPageId)
    .map((r) =>
      // キーの順番を固定する
      JSON.stringify({
        wikiPageId: r.wikiPageId,
        title: r.title,
        wikiRevisionId: r.wikiRevisionId,
        wikiFetchedAt: r.wikiFetchedAt.toISOString(),
        summary: r.summary,
        imageUrl: r.imageUrl,
        imageCredit: r.imageCredit,
        rarity: r.rarity,
        monthlyPageviews: r.monthlyPageviews,
        pageviewsMeasuredAt: r.pageviewsMeasuredAt.toISOString(),
        isActive: r.isActive,
      }),
    );
  await writeFile(path.join(cardsDir, `${genreSlug}.jsonl`), lines.map((l) => `${l}\n`).join(""));
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
