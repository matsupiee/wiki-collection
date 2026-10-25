import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { readCardStore } from "./card-store";
import { genreColor } from "./genre-color";
import { importCards } from "./import-cards";
import { createFakeWikimedia, type FakeArticle, type FakeWiki } from "./test/fake-wikimedia";
import { createWikimediaClient, USER_AGENT } from "./wikimedia-client";

let dataDir: string;
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "wiki-import-"));
});
afterAll(() => rm(dataDir, { recursive: true, force: true }));

const now = new Date("2026-10-25T00:00:00Z");
const text = (title: string) =>
  `${title}はテスト用に用意した記事で、要約として三十文字以上の文章を返す。`;
const planet = { id: "Q634", label: "惑星" };
const article = (pageId: number, title: string, extra: Partial<FakeArticle> = {}): FakeArticle => ({
  pageId,
  title,
  extract: text(title),
  revision: pageId * 1000,
  wikidata: { id: `Q${9000 + pageId}`, instanceOf: [planet] },
  ...extra,
});

function testWiki(): FakeWiki {
  return {
    articles: [
      article(1, "太陽", {
        imageFile: "Sun photo.jpg",
        wikidata: { id: "Q525", instanceOf: [{ id: "Q523", label: "恒星" }] },
      }),
      article(2, "月", { imageFile: "Moon local.jpg" }),
      article(3, "火星", { imageFile: "Mars.jpg" }),
      article(4, "土星"),
      // 推奨ランクの分類を選ぶ
      article(5, "金星", {
        wikidata: {
          id: "Q9005",
          instanceOf: [planet, { id: "Q99999", label: "地球型惑星", preferred: true }],
        },
      }),
      // 同じランクなら ID の数字が小さい分類を選ぶ
      article(6, "木星", {
        wikidata: { id: "Q9006", instanceOf: [{ id: "Q30000", label: "巨大ガス惑星" }, planet] },
      }),
      article(7, "宇宙", { disambiguation: true }),
      article(8, "惑星の一覧"),
      // 事故のカテゴリは continue の2回目で返る
      article(9, "ロケットの爆発", { categories: ["宇宙開発", "ロケット", "宇宙開発の事故"] }),
      article(10, "短い記事", { extract: "短い。" }),
      article(11, "Wikipedia:ガイド", { ns: 4 }),
      article(12, "分類のない記事", { wikidata: undefined }),
      article(13, "ラベルのない記事", {
        wikidata: { id: "Q9013", instanceOf: [{ id: "Q77777" }] },
      }),
      article(14, "メインページ", {
        wikidata: {
          id: "Q5296",
          instanceOf: [{ id: "Q5296", label: "ウィキメディアのメインページ" }],
        },
      }),
    ],
    images: [
      { file: "Sun photo.jpg", repository: "shared", license: "CC BY-SA 4.0", artist: "NASA" },
      // 日本語版にだけある画像と、フリーでない画像は使わない
      { file: "Moon local.jpg", repository: "local", license: "CC BY-SA 4.0", artist: "誰か" },
      { file: "Mars.jpg", repository: "shared", license: "All rights reserved", artist: "誰か" },
    ],
  };
}

// 閲覧数の多い順。15 は存在しないページ
const views = [1200, 1000, 800, 600, 400, 200, 150, 140, 130, 120, 110, 100, 90, 80, 70];
const topPages = views.map((monthlyPageviews, i) => ({ pageId: i + 1, monthlyPageviews }));

const readLines = async (file: string) =>
  (await readFile(path.join(dataDir, file), "utf8"))
    .trimEnd()
    .split("\n")
    .map((l) => JSON.parse(l));

describe("importCards", () => {
  test("上位の記事を Wikidata の分類をジャンルにして取り込み、除外の条件に当たる記事を外し、上位の一覧全体からレアリティの下限を決める", async () => {
    const fake = createFakeWikimedia(testWiki());

    const result = await importCards({
      client: createWikimediaClient({ fetch: fake.fetch }),
      dataDir,
      topPages,
      limit: 100,
      now,
    });

    // 15 件の順位で決める。各レアリティに最低1枚入る
    expect(result.createdThresholds).toEqual({
      legendary: 1200,
      double_rare: 1000,
      rare: 800,
      uncommon: 140,
    });
    expect(
      JSON.parse(await readFile(path.join(dataDir, "rarity-thresholds.json"), "utf8")),
    ).toEqual(result.createdThresholds);

    // page_id 順で、10 万件ごとのファイルに書く
    const cards = await readLines("cards/000.jsonl");
    expect(cards.map((c) => [c.title, c.genre, c.rarity, c.monthlyPageviews])).toEqual([
      ["太陽", "Q523", "legendary", 1200],
      ["月", "Q634", "double_rare", 1000],
      ["火星", "Q634", "rare", 800],
      ["土星", "Q634", "uncommon", 600],
      ["金星", "Q99999", "uncommon", 400],
      ["木星", "Q634", "uncommon", 200],
    ]);
    expect(cards[0]).toEqual({
      wikiPageId: 1,
      title: "太陽",
      genre: "Q523",
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
    expect(cards[1].imageUrl).toBeNull();
    expect(cards[2].imageUrl).toBeNull();

    // ジャンルは分類の日本語ラベルを名前にし、ID の数字順に並べる
    expect(await readLines("genres.jsonl")).toEqual([
      { slug: "Q523", name: "恒星", colorHex: genreColor("Q523") },
      { slug: "Q634", name: "惑星", colorHex: genreColor("Q634") },
      { slug: "Q99999", name: "地球型惑星", colorHex: genreColor("Q99999") },
    ]);

    expect(await readLines("excluded.jsonl")).toEqual([
      { wikiPageId: 7, title: "宇宙", reason: "曖昧さ回避" },
      { wikiPageId: 8, title: "惑星の一覧", reason: "一覧記事" },
      { wikiPageId: 9, title: "ロケットの爆発", reason: "事件・事故" },
      { wikiPageId: 10, title: "短い記事", reason: "要約が短い" },
      { wikiPageId: 11, title: "Wikipedia:ガイド", reason: "記事ではない" },
      { wikiPageId: 12, title: "分類のない記事", reason: "Wikidata の分類がない" },
      { wikiPageId: 13, title: "ラベルのない記事", reason: "Wikidata の分類がない" },
      { wikiPageId: 14, title: "メインページ", reason: "記事ではない" },
      { wikiPageId: 15, title: "", reason: "ページがない" },
    ]);
    expect(result.inserted).toHaveLength(6);
    expect(result.excluded).toHaveLength(9);

    // すべてのリクエストに、リポジトリの URL を入れた User-Agent を付ける
    expect(fake.requests.every((r) => r.userAgent === USER_AGENT)).toBe(true);
  });

  test("あとの取り込みでは、カードにも除外にもなっていない記事を上から limit 件だけ調べ、決めてある下限でレアリティを決める", async () => {
    const wiki = testWiki();
    wiki.articles.push(
      article(16, "彗星", {
        wikidata: { id: "Q9016", instanceOf: [{ id: "Q3559", label: "彗星" }] },
      }),
      article(17, "小惑星"),
    );
    const fake = createFakeWikimedia(wiki);

    const result = await importCards({
      client: createWikimediaClient({ fetch: fake.fetch }),
      dataDir,
      topPages: [
        ...topPages,
        { pageId: 16, monthlyPageviews: 900 },
        { pageId: 17, monthlyPageviews: 60 },
      ],
      limit: 1,
      now,
    });

    expect(result.createdThresholds).toBeNull();
    expect(result.inserted).toEqual([
      { title: "彗星", genre: "彗星", rarity: "rare", monthlyPageviews: 900 },
    ]);
    expect(result.excluded).toEqual([]);
    // カードにした記事も、除外した記事も取り直さない
    expect(fake.requests.some((r) => r.url.includes("/page/summary/%E5%A4%AA%E9%99%BD"))).toBe(
      false,
    );
    expect(fake.requests.some((r) => /pageids=[^&]*\b7\b/.test(decodeURIComponent(r.url)))).toBe(
      false,
    );

    const store = await readCardStore(dataDir);
    expect(store.cards.map((c) => c.title)).toEqual([
      "太陽",
      "月",
      "火星",
      "土星",
      "金星",
      "木星",
      "彗星",
    ]);
    expect(store.genres.map((g) => g.slug)).toEqual(["Q523", "Q634", "Q3559", "Q99999"]);
    expect(store.thresholds).toEqual({
      legendary: 1200,
      double_rare: 1000,
      rare: 800,
      uncommon: 140,
    });
  });
});
