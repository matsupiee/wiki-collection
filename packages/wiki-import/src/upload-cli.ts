import { commonsImageUrl } from "@wiki-collection/db/card-image";
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { catalogBucket, encodePart, latestKey, partKey } from "./catalog";
import { dumpFile, dumpArticleSchema, type DumpArticle } from "./dump-article";
import { importChunk } from "./import-cards";
import { mirrorImages, type ImageStorage } from "./mirror-images";
import type { TopPage } from "./top-pages";
import { createWikimediaClient, type WikimediaClient } from "./wikimedia-client";

export async function publishCatalog(
  input: string,
  storage: ImageStorage,
  client: WikimediaClient,
) {
  const source = await open(input);
  try {
    const hash = createHash("sha256");
    for await (const chunk of source.createReadStream({ autoClose: false })) hash.update(chunk);
    const snapshot = hash.digest("hex");
    let parts = 0;
    let articles = 0;
    let pages: (TopPage | DumpArticle)[] = [];
    async function upload() {
      const key = partKey(snapshot, parts);
      if (!(await storage.exists(key))) {
        const part = await importChunk(client, { pages, genres: new Map(), now: new Date() });
        const unavailable = new Set<string>();
        const images = await mirrorImages({
          cards: part.cards.filter((c) => c.rarity !== "common"),
          storage,
          onUnavailable: (source) => unavailable.add(source),
          log: console.log,
        });
        if (images.failed) throw new Error("画像保存に失敗しました。再実行してください");
        for (const card of part.cards) {
          const url = card.imageUrl && commonsImageUrl(card.imageUrl);
          if (card.imageUrl && (!url || unavailable.has(url))) {
            card.imageUrl = null;
            card.imageCredit = null;
          }
        }
        await storage.put(key, encodePart(part), "application/gzip");
      }
      articles += pages.length;
      parts++;
      pages = [];
      console.log(`${articles} 記事処理済み`);
    }
    for await (const line of createInterface({
      input: source.createReadStream({ start: 0, autoClose: false }),
    })) {
      if (line.startsWith("{")) {
        pages.push(dumpArticleSchema.parse(JSON.parse(line)));
      } else {
        // 以前に生成した2列のTSVも引き続き読める。
        if (!/^[1-9]\d*\t\d+$/.test(line)) throw new Error("記事一覧が不正です");
        const [pageId, monthlyPageviews] = line.split("\t").map(Number);
        pages.push({ pageId: pageId!, monthlyPageviews: monthlyPageviews! });
      }
      if (pages.length === 500) await upload();
    }
    if (pages.length) await upload();
    if (!parts) throw new Error("記事一覧が空です");
    await storage.put(
      latestKey,
      new TextEncoder().encode(JSON.stringify({ version: 1, snapshot, parts, articles })),
      "application/json",
    );
  } finally {
    await source.close();
  }
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { input: { type: "string", default: dumpFile } } });
  const bucket = catalogBucket();
  await publishCatalog(
    values.input,
    {
      exists: (key) => bucket.file(key).exists(),
      async put(key, bytes, type) {
        await bucket.file(key).write(bytes, { type });
      },
    },
    createWikimediaClient(),
  );
}
