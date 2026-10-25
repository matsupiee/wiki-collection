import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Database } from "@wiki-collection/db";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { asc } from "drizzle-orm";

import { type CardRecord, writeGenreCards, writeThresholds } from "./card-store";
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

describe("loadCards", () => {
  test("JSONL のカードとレアリティの下限を D1 に入れ、何度実行しても同じ状態になる", async () => {
    const [space] = await db
      .insert(genre)
      .values({ slug: "space", name: "宇宙", sourceCategory: "天文学", colorHex: "#6366f1" })
      .returning();
    await writeGenreCards(dataDir, "space", [
      record(2, "月", { rarity: "rare", monthlyPageviews: 900 }),
      record(1, "太陽", { rarity: "legendary", imageUrl: "https://example.com/sun.jpg" }),
    ]);
    await writeThresholds(dataDir, { legendary: 1000, double_rare: 950, rare: 800, uncommon: 300 });

    expect(await loadCards({ db, dataDir })).toEqual({ cards: 2, thresholds: true });
    expect(await loadCards({ db, dataDir })).toEqual({ cards: 2, thresholds: true });

    const cards = await db.select().from(card).orderBy(asc(card.wikiPageId));
    expect(cards.map((c) => [c.title, c.wikiLang, c.genreId, c.rarity, c.isActive])).toEqual([
      ["太陽", "ja", space!.id, "legendary", true],
      ["月", "ja", space!.id, "rare", true],
    ]);
    expect(cards[0]!.imageUrl).toBe("https://example.com/sun.jpg");
    expect(cards[0]!.wikiRevisionId).toBe(1000);
    expect(cards[0]!.wikiFetchedAt).toEqual(fetchedAt);
    const thresholds = await db.select().from(rarityThreshold);
    expect(Object.fromEntries(thresholds.map((t) => [t.rarity, t.minMonthlyPageviews]))).toEqual({
      legendary: 1000,
      double_rare: 950,
      rare: 800,
      uncommon: 300,
    });
  });

  test("JSONL で isActive を false にすると排出が止まり、ほかの列は書き換えない", async () => {
    await writeGenreCards(dataDir, "space", [
      record(1, "太陽", {
        rarity: "common",
        summary: "書き換えた要約は反映しない。",
        isActive: false,
      }),
      record(2, "月", { rarity: "rare", monthlyPageviews: 900 }),
    ]);

    await loadCards({ db, dataDir });

    const [sun] = await db.select().from(card).orderBy(asc(card.wikiPageId)).limit(1);
    expect(sun!.isActive).toBe(false);
    expect(sun!.rarity).toBe("legendary");
    expect(sun!.summary).not.toBe("書き換えた要約は反映しない。");
  });

  test("D1 にないジャンルの JSONL があるとエラーになり、何も入れない", async () => {
    await writeGenreCards(dataDir, "unknown", [record(3, "知らない記事")]);

    await expect(loadCards({ db, dataDir })).rejects.toThrow("D1 にジャンルがありません");
    expect(await db.select().from(card)).toHaveLength(2);
  });
});
