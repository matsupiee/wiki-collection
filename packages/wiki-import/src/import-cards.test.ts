import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { readCardStore } from "./card-store";
import { importCards } from "./import-cards";
import { createFakeWikimedia, type FakeArticle, type FakeWiki } from "./test/fake-wikimedia";
import { createWikimediaClient, USER_AGENT } from "./wikimedia-client";

let dataDir: string;
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "wiki-import-"));
});
afterAll(() => rm(dataDir, { recursive: true, force: true }));

const genres = [{ slug: "space", name: "宇宙", sourceCategory: "テスト天文学" }];

const now = new Date("2026-10-25T00:00:00Z");
const text = (title: string) =>
  `${title}はテスト用に用意した記事で、要約として三十文字以上の文章を返す。`;
const article = (
  pageId: number,
  title: string,
  monthly: number,
  extra: Partial<FakeArticle> = {},
) => ({
  pageId,
  title,
  extract: text(title),
  revision: pageId * 1000,
  monthlyViews: Array.from({ length: 12 }, () => monthly),
  ...extra,
});

function spaceWiki(): FakeWiki {
  return {
    categories: {
      テスト天文学: { pages: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], subcats: ["テスト惑星"] },
      テスト惑星: { pages: [6] },
    },
    articles: [
      article(1, "太陽", 1200, { imageFile: "Sun photo.jpg" }),
      article(2, "月", 1000, { imageFile: "Moon local.jpg" }),
      article(3, "火星", 800, { imageFile: "Mars.jpg" }),
      article(4, "土星", 600),
      article(5, "金星", 400),
      article(6, "木星", 200),
      article(7, "宇宙", 5000, { disambiguation: true }),
      article(8, "惑星の一覧", 5000),
      // 事故のカテゴリは continue の2回目で返る
      article(9, "ロケットの爆発", 5000, {
        categories: ["宇宙開発", "ロケット", "宇宙開発の事故"],
      }),
      article(10, "短い記事", 5000, { extract: "短い。" }),
      // できたばかりの記事。閲覧のない月も12か月に数える
      article(11, "新しい星", 0, { monthlyViews: [3000] }),
    ],
    images: [
      { file: "Sun photo.jpg", repository: "shared", license: "CC BY-SA 4.0", artist: "NASA" },
      // 日本語版にだけある画像と、フリーでない画像は使わない
      { file: "Moon local.jpg", repository: "local", license: "CC BY-SA 4.0", artist: "誰か" },
      { file: "Mars.jpg", repository: "shared", license: "All rights reserved", artist: "誰か" },
    ],
  };
}

describe("importCards", () => {
  test("カテゴリの記事を取り込み、除外の条件に当たる記事を外し、最初の取り込みでレアリティの下限を決める", async () => {
    const wiki = spaceWiki();
    const fake = createFakeWikimedia(wiki);

    const result = await importCards({
      client: createWikimediaClient({ fetch: fake.fetch }),
      dataDir,
      genres,
      depth: 1,
      maxPagesPerGenre: 100,
      now,
    });

    expect(result.excluded.sort((a, b) => a.title.localeCompare(b.title))).toEqual(
      [
        { title: "宇宙", reason: "曖昧さ回避" },
        { title: "惑星の一覧", reason: "一覧記事" },
        { title: "ロケットの爆発", reason: "事件・事故" },
        { title: "短い記事", reason: "要約が短い" },
      ].sort((a, b) => a.title.localeCompare(b.title)),
    );
    // 7枚の順位で決める。各レアリティに最低1枚入る
    expect(result.createdThresholds).toEqual({
      legendary: 1200,
      double_rare: 1000,
      rare: 800,
      uncommon: 600,
    });

    // ジャンルの JSONL に page_id 順で書く
    const lines = (await readFile(path.join(dataDir, "cards/space.jsonl"), "utf8"))
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.map((c) => [c.title, c.rarity, c.monthlyPageviews])).toEqual([
      ["太陽", "legendary", 1200],
      ["月", "double_rare", 1000],
      ["火星", "rare", 800],
      ["土星", "uncommon", 600],
      ["金星", "common", 400],
      ["木星", "common", 200],
      ["新しい星", "common", 250],
    ]);
    expect(lines[0]).toEqual({
      wikiPageId: 1,
      title: "太陽",
      wikiRevisionId: 1000,
      wikiFetchedAt: now.toISOString(),
      summary: text("太陽"),
      imageUrl: "https://upload.wikimedia.org/thumb/640px-Sun photo.jpg",
      imageCredit: "NASA・CC BY-SA 4.0（Wikimedia Commons）",
      rarity: "legendary",
      monthlyPageviews: 1200,
      pageviewsMeasuredAt: now.toISOString(),
      isActive: true,
    });
    expect(lines[1].imageUrl).toBeNull();
    expect(lines[2].imageUrl).toBeNull();

    expect(
      JSON.parse(await readFile(path.join(dataDir, "rarity-thresholds.json"), "utf8")),
    ).toEqual({ legendary: 1200, double_rare: 1000, rare: 800, uncommon: 600 });

    // すべてのリクエストに、リポジトリの URL を入れた User-Agent を付ける
    expect(fake.requests.every((r) => r.userAgent === USER_AGENT)).toBe(true);
    expect(
      fake.requests.some((r) =>
        r.url.includes("/user/%E5%A4%AA%E9%99%BD/monthly/20251001/20260930"),
      ),
    ).toBe(true);
  });

  test("あとの取り込みでは、すでにある記事を取り直さず、決めてある下限でレアリティを決める", async () => {
    const wiki = spaceWiki();
    wiki.categories.テスト天文学!.pages.push(12);
    wiki.articles.push(article(12, "彗星", 900));
    const fake = createFakeWikimedia(wiki);

    const result = await importCards({
      client: createWikimediaClient({ fetch: fake.fetch }),
      dataDir,
      genres,
      genreSlugs: ["space"],
      depth: 1,
      maxPagesPerGenre: 100,
      now,
    });

    expect(result.createdThresholds).toBeNull();
    expect(result.inserted).toEqual([
      { title: "彗星", genreSlug: "space", rarity: "rare", monthlyPageviews: 900 },
    ]);
    expect(fake.requests.some((r) => r.url.includes("/page/summary/%E5%A4%AA%E9%99%BD"))).toBe(
      false,
    );
    const store = await readCardStore(dataDir);
    expect(store.cards.get("space")!.map((c) => c.title)).toEqual([
      "太陽",
      "月",
      "火星",
      "土星",
      "金星",
      "木星",
      "新しい星",
      "彗星",
    ]);
    expect(store.thresholds).toEqual({
      legendary: 1200,
      double_rare: 1000,
      rare: 800,
      uncommon: 600,
    });
  });

  test("存在しないジャンルを指定するとエラーになる", async () => {
    const fake = createFakeWikimedia(spaceWiki());
    await expect(
      importCards({
        client: createWikimediaClient({ fetch: fake.fetch }),
        dataDir,
        genres,
        genreSlugs: ["unknown"],
        depth: 1,
        maxPagesPerGenre: 100,
      }),
    ).rejects.toThrow("ジャンルが見つかりません: unknown");
  });
});
