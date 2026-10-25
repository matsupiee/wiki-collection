import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Database } from "@wiki-collection/db";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { asc } from "drizzle-orm";

import { type CardRecord, writeCards, writeGenres, writeThresholds } from "./card-store";
import { loadCards } from "./load-cards";
import { createTestDb } from "./test/create-test-db";

let db: Database;
let dispose: () => Promise<void>;
let dataDir: string;
beforeAll(async () => {
  ({ db, dispose } = await createTestDb());
  dataDir = await mkdtemp(path.join(tmpdir(), "wiki-load-"));
});
afterAll(async () => {
  await dispose();
  await rm(dataDir, { recursive: true, force: true });
});

const fetchedAt = new Date("2026-10-25T00:00:00Z");
const record = (wikiPageId: number, title: string, extra: Partial<CardRecord> = {}) => ({
  wikiPageId,
  title,
  genre: "Q634",
  wikiRevisionId: wikiPageId * 1000,
  wikiFetchedAt: fetchedAt,
  summary: `${title}はテスト用に用意した記事で、要約として三十文字以上の文章を返す。`,
  imageUrl: null,
  imageCredit: null,
  rarity: "common" as const,
  monthlyPageviews: 100,
  pageviewsMeasuredAt: fetchedAt,
  isActive: true,
  ...extra,
});
const genres = [
  { slug: "Q523", name: "恒星", colorHex: "#aa3300" },
  { slug: "Q634", name: "惑星", colorHex: "#3344aa" },
];

describe("loadCards", () => {
  test("ジャンル、カード、レアリティの下限を D1 に入れ、何度実行しても同じ状態になる", async () => {
    const cards = [
      record(1, "太陽", {
        genre: "Q523",
        rarity: "legendary",
        imageUrl: "https://example.com/sun.jpg",
      }),
      record(2, "火星", { rarity: "rare", monthlyPageviews: 900 }),
      // 10 万件ごとに別のファイルに入る
      record(250_000, "土星"),
    ];
    await writeCards(dataDir, cards, cards);
    await writeGenres(dataDir, genres);
    await writeThresholds(dataDir, { legendary: 1000, double_rare: 950, rare: 800, uncommon: 300 });

    expect(await loadCards({ db, dataDir })).toEqual({ genres: 2, cards: 3, thresholds: true });
    expect(await loadCards({ db, dataDir })).toEqual({ genres: 2, cards: 3, thresholds: true });

    // カードの多いジャンルから並べる
    const genreRows = await db.select().from(genre).orderBy(asc(genre.sortOrder));
    expect(genreRows.map((g) => [g.slug, g.name, g.colorHex, g.sortOrder])).toEqual([
      ["Q634", "惑星", "#3344aa", 0],
      ["Q523", "恒星", "#aa3300", 1],
    ]);
    const genreName = new Map(genreRows.map((g) => [g.id, g.name]));
    const rows = await db.select().from(card).orderBy(asc(card.wikiPageId));
    expect(rows.map((c) => [c.title, c.wikiLang, genreName.get(c.genreId), c.rarity])).toEqual([
      ["太陽", "ja", "恒星", "legendary"],
      ["火星", "ja", "惑星", "rare"],
      ["土星", "ja", "惑星", "common"],
    ]);
    expect(rows[0]!.imageUrl).toBe("https://example.com/sun.jpg");
    expect(rows[0]!.wikiRevisionId).toBe(1000);
    expect(rows[0]!.wikiFetchedAt).toEqual(fetchedAt);
    const thresholds = await db.select().from(rarityThreshold);
    expect(Object.fromEntries(thresholds.map((t) => [t.rarity, t.minMonthlyPageviews]))).toEqual({
      legendary: 1000,
      double_rare: 950,
      rare: 800,
      uncommon: 300,
    });
  });

  test("JSONL で isActive を false にすると排出が止まり、ほかの列は書き換えない", async () => {
    const cards = [
      record(1, "太陽", {
        genre: "Q634",
        rarity: "common",
        summary: "書き換えた要約は反映しない。",
        isActive: false,
      }),
      record(2, "火星", { rarity: "rare", monthlyPageviews: 900 }),
    ];
    await writeCards(dataDir, cards, cards);

    await loadCards({ db, dataDir });

    const [sun] = await db.select().from(card).orderBy(asc(card.wikiPageId)).limit(1);
    expect(sun!.isActive).toBe(false);
    expect(sun!.rarity).toBe("legendary");
    expect(sun!.summary).not.toBe("書き換えた要約は反映しない。");
  });

  test("genres.jsonl にないジャンルのカードがあるとエラーになり、何も入れない", async () => {
    const cards = [record(3, "知らない記事", { genre: "Q1" })];
    await writeCards(dataDir, cards, cards);

    await expect(loadCards({ db, dataDir })).rejects.toThrow("genres.jsonl にないジャンル");
    expect(await db.select().from(card)).toHaveLength(3);
  });
});
