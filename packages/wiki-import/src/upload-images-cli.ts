import type { Database } from "@wiki-collection/db";
import { cardImageKey, commonsImageUrl } from "@wiki-collection/db/card-image";
import { card } from "@wiki-collection/db/schema/index";
import { withProductionDb } from "@wiki-collection/db/seed/prod-db";
import { and, eq } from "drizzle-orm";
import { measuredImageStorage, type ImageDimensions } from "./measured-image-storage";
import { open } from "node:fs/promises";
import { readLines } from "./read-lines";
import { parseArgs } from "node:util";
import { catalogBucket } from "./catalog";
import { dumpFile, dumpArticleSchema, type DumpArticle } from "./dump-article";
import { importChunk } from "./import-cards";
import { mirrorImages, type ImageStorage } from "./mirror-images";
import type { TopPage } from "./top-pages";
import { createWikimediaClient, type WikimediaClient } from "./wikimedia-client";

export async function uploadImages(
  input: string,
  storage: { read(key: string): Promise<Uint8Array | null>; put: ImageStorage["put"] },
  client: WikimediaClient,
  db: Database,
) {
  const source = await open(input);
  try {
    let articles = 0;
    let pages: (TopPage | DumpArticle)[] = [];
    async function upload() {
      const part = await importChunk(client, { pages, genres: new Map(), now: new Date() });
      const sizes = new Map<string, ImageDimensions>();
      const images = await mirrorImages({
        cards: part.cards.filter((card) => card.rarity !== "common" && card.rarity !== "uncommon"),
        storage: measuredImageStorage(storage.read, storage.put, sizes),
        onUnavailable: (url) => console.log(`対象外の画像: ${url}`),
        log: console.log,
      });
      if (images.failed) throw new Error("画像保存に失敗しました。再実行してください");
      for (const row of part.cards) {
        const url = row.imageUrl && commonsImageUrl(row.imageUrl);
        if (!url) continue;
        const size = sizes.get(await cardImageKey(url));
        if (size)
          await db
            .update(card)
            .set(size)
            .where(
              and(
                eq(card.wikiLang, "ja"),
                eq(card.wikiPageId, row.wikiPageId),
                eq(card.imageUrl, row.imageUrl!),
              ),
            );
      }
      articles += pages.length;
      pages = [];
      console.log(`${articles} 記事処理済み`);
    }
    for await (const line of readLines(source.createReadStream({ autoClose: false }))) {
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
    if (!articles) throw new Error("記事一覧が空です");
  } finally {
    await source.close();
  }
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      input: { type: "string", default: dumpFile },
      "wrangler-config": { type: "string" },
    },
  });
  // Wrangler のリモートバインディングは Node.js 上で実行する。
  if (values["wrangler-config"] && typeof Bun !== "undefined") {
    const run = Bun.spawn(
      ["node", "--import", import.meta.resolve("tsx"), import.meta.path, ...process.argv.slice(2)],
      { stdout: "inherit", stderr: "inherit" },
    );
    process.exit(await run.exited);
  }
  if (values["wrangler-config"]) {
    const { withRemoteBindings } = await import("./remote-bucket");
    const { createDb } = await import("@wiki-collection/db");
    await withRemoteBindings(values["wrangler-config"], async (env) => {
      await uploadImages(
        values.input,
        {
          async read(key) {
            const obj = await env.CARD_IMAGES.get(key);
            return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
          },
          async put(key, bytes, type) {
            await env.CARD_IMAGES.put(key, bytes, { httpMetadata: { contentType: type } });
          },
        },
        createWikimediaClient(),
        createDb(env),
      );
    });
  } else {
    const bucket = catalogBucket();
    await withProductionDb(async (db) => {
      await uploadImages(
        values.input,
        {
          async read(key) {
            const file = bucket.file(key);
            return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : null;
          },
          async put(key, bytes, type) {
            await bucket.file(key).write(bytes, { type });
          },
        },
        createWikimediaClient(),
        db,
      );
    });
  }
}
