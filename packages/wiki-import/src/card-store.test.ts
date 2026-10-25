import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { readCardStore } from "./card-store";

let dataDir: string;
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "card-store-"));
});
afterAll(() => rm(dataDir, { recursive: true, force: true }));

describe("readCardStore", () => {
  test("ディレクトリがなければ、何もない状態として読む", async () => {
    const store = await readCardStore(path.join(dataDir, "missing"));
    expect(store).toEqual({ cards: [], genres: [], excluded: [], thresholds: null });
  });

  test("形の合わない行があると、ファイル名と行番号を出してエラーになる", async () => {
    await mkdir(path.join(dataDir, "cards"), { recursive: true });
    await writeFile(
      path.join(dataDir, "cards/000.jsonl"),
      `${JSON.stringify({
        wikiPageId: 1,
        title: "太陽",
        genre: "Q523",
        wikiRevisionId: 1000,
        wikiFetchedAt: "2026-10-25T00:00:00.000Z",
        summary: "要約",
        imageUrl: null,
        imageCredit: null,
        rarity: "legendary",
        monthlyPageviews: 1200,
        pageviewsMeasuredAt: "2026-10-25T00:00:00.000Z",
        isActive: true,
      })}\n${JSON.stringify({ wikiPageId: 2, title: "月", rarity: "mythic" })}\n`,
    );

    await expect(readCardStore(dataDir)).rejects.toThrow("cards/000.jsonl の 2 行目が読めません");
  });
});
