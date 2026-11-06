import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { backfillLengths } from "./backfill-lengths";
import { readCardStore, writeCards, type CardRecord } from "./card-store";
import { createWikimediaClient } from "./wikimedia-client";
test("保存済みの版のサイズだけを補完し、測定済みカードは変更しない。再実行はAPIを呼ばない", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "lengths-"));
  try {
    const c: CardRecord = {
      wikiPageId: 1,
      title: "テスト",
      genre: "Q1",
      wikiRevisionId: 42,
      wikiFetchedAt: new Date(),
      summary: "短い要約",
      imageUrl: null,
      imageCredit: null,
      rarity: "common",
      monthlyPageviews: 100,
      pageviewsMeasuredAt: new Date(),
      isActive: true,
    };
    await writeCards(dir, [c, { ...c, wikiPageId: 2, articleLength: 123 }], [c]);
    let calls = 0;
    const client = createWikimediaClient({
      fetch: async (url) => {
        calls++;
        expect(new URL(url).searchParams.get("revids")).toBe("42");
        return Response.json({
          query: {
            pages: [{ pageid: 1, title: "テスト", ns: 0, revisions: [{ revid: 42, size: 8765 }] }],
          },
        });
      },
    });
    expect(await backfillLengths(client, dir)).toEqual({ updated: 1, missing: 0 });
    const store = await readCardStore(dir);
    expect(store.cards[0]).toMatchObject({ ...c, articleLength: 8765 });
    expect(store.cards[1]!.articleLength).toBe(123);
    expect(await backfillLengths(client, dir)).toEqual({ updated: 0, missing: 0 });
    expect(calls).toBe(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
