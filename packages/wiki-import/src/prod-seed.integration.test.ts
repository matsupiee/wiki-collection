import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { card, genre, rarityThreshold } from "@wiki-collection/db/schema/index";
import { seedLocalDump } from "@wiki-collection/db/seed/prod-sql";
import { createTestDb } from "./test/create-test-db";

test("ローカルJSONLからD1へ一括投入し、再実行時もカードID・版・停止状態・画像寸法を保持する", async () => {
  const { db, dispose } = await createTestDb();
  const dir = await mkdtemp(path.join(tmpdir(), "wiki-seed-prod-"));
  try {
    const file = path.join(dir, "articles.jsonl");
    const article = {
      pageId: 1,
      title: "O'Brien; -- 星",
      summary: "赤い星は宇宙にたくさんあります。\nこの天体は昔からよく観測されています。",
      revisionId: 2,
      monthlyPageviews: 1000,
      articleLength: 891,
      metadata: {
        categories: [],
        isDisambiguation: false,
        instanceOf: { id: "Q1", label: "星" },
        image: null,
      },
    };
    const input = [article, { ...article, pageId: 2, title: "星の一覧" }];
    await writeFile(file, input.map((x) => JSON.stringify(x)).join("\n"));
    const execute = async (sql: string) => {
      await db.$client.exec(sql);
    };
    expect(await seedLocalDump(file, execute)).toEqual({ articles: 2, cards: 1, files: 1 });
    const [row] = await db.select().from(card);
    expect(row).toMatchObject({ title: article.title, summary: article.summary, rarity: "rare" });
    await db
      .update(card)
      .set({ isActive: false, imageWidth: 20, imageHeight: 30, articleLength: null })
      .where(eq(card.id, row!.id));
    await writeFile(file, JSON.stringify({ ...article, revisionId: 3, monthlyPageviews: 0 }));
    await seedLocalDump(file, execute);
    expect(await db.select().from(card)).toMatchObject([
      {
        id: row!.id,
        isActive: false,
        wikiRevisionId: 2,
        rarity: "rare",
        articleLength: 891,
        imageWidth: 20,
        imageHeight: 30,
      },
    ]);
    expect(await db.select().from(genre)).toHaveLength(1);
    expect(await db.select().from(rarityThreshold)).toHaveLength(4);
  } finally {
    await dispose();
    await rm(dir, { force: true, recursive: true });
  }
});
