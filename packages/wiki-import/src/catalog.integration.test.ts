import sharp from "sharp";
import { cardImageKey } from "@wiki-collection/db/card-image";
import { gzipSync } from "node:zlib";
import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { enrichDump } from "./enrich-dump";
import { uploadImages } from "./upload-images-cli";
import { importChunk } from "./import-cards";
import { decodePart, encodePart } from "./catalog";
import { createWikimediaClient } from "./wikimedia-client";
import { createFakeWikimedia } from "./test/fake-wikimedia";
import { createTestDb } from "./test/create-test-db";
import { loadRecords } from "./load-cards";
import { card } from "@wiki-collection/db/schema/index";
import { rarityThresholds } from "@wiki-collection/db/rarity";

test("全記事ダンプから公開版を作り、未閲覧の記事と既存カードを正しくD1へ読み込む", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wiki-catalog-"));
  const { db, dispose } = await createTestDb();
  try {
    const xml = path.join(dir, "articles.bz2"),
      views = path.join(dir, "views.bz2"),
      output = path.join(dir, "articles.jsonl");
    const bz2 = async (file: string, text: string) => {
      const proc = Bun.spawn(["bzip2", "-c"], { stdin: new Blob([text]), stdout: "pipe" });
      await Bun.write(file, new Response(proc.stdout));
      expect(await proc.exited).toBe(0);
    };
    await bz2(
      xml,
      `<mediawiki xmlns="urn:mediawiki">${[1, 2]
        .map(
          (
            id,
          ) => `<page><title>星${id}</title><ns>0</ns><id>${id}</id><revision><id>${id + 123}</id><text bytes="300">{{Infobox|name=星}}
{{読み仮名|星|ほし|{{lang-en-short|star}}}}は、[[天体|宇宙の天体]]を表す言葉であり、この記事はその特徴を説明する。&lt;ref&gt;脚注&lt;/ref&gt;

== 歴史 ==
後の節。</text></revision></page>`,
        )
        .join(
          "",
        )}<page><ns>0</ns><id>3</id><redirect title="Moon"/></page><page><ns>1</ns><id>4</id></page></mediawiki>`,
    );
    await bz2(views, "ja.wikipedia Moon 2 desktop 50000 0\n");
    async function sqlDump(table: string, columns: string[], rows: string[]) {
      const fields = columns.map((name) => "  `" + name + "` TEXT").join(",\n");
      const sql =
        "CREATE TABLE `" +
        table +
        "` (\n" +
        fields +
        "\n);\nINSERT INTO `" +
        table +
        "` VALUES\n" +
        rows.join(",\n") +
        ";\n";
      await writeFile(path.join(dir, "jawiki-latest-" + table + ".sql.gz"), gzipSync(sql));
    }
    await sqlDump(
      "page_props",
      ["pp_page", "pp_propname", "pp_value"],
      [
        "(1,'wikibase_item','Q1')",
        "(2,'wikibase_item','Q2')",
        "(1,'page_image_free','Star.jpg')",
        "(2,'page_image_free','Local.png')",
      ],
    );
    await sqlDump("linktarget", ["lt_id", "lt_namespace", "lt_title"], ["(7,14,'天体')"]);
    await sqlDump("categorylinks", ["cl_from", "cl_target_id"], ["(1,7)"]);
    await sqlDump("image", ["img_name"], ["('Local.png')"]);
    const claim = (data: unknown, rank = "normal") => ({
      rank,
      mainsnak: { datavalue: { value: data } },
    });
    const entities = (items: unknown[]) =>
      "[\n" + items.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
    await bz2(
      path.join(dir, "latest-all.json.bz2"),
      entities([
        ...[1, 2].map((id) => ({
          id: "Q" + id,
          claims: { P31: [claim({ id: "Q88" }), claim({ id: "Q99" }, "preferred")] },
        })),
        { id: "Q99", labels: { ja: { value: "惑星" } } },
        { id: "Q88", labels: { ja: { value: "天体" } } },
      ]),
    );
    await bz2(
      path.join(dir, "latest-mediainfo.json.bz2"),
      entities([
        {
          title: "File:Star.jpg",
          statements: {
            P3575: [claim({ amount: "+100", unit: "http://www.wikidata.org/entity/Q8799" })],
            P275: [claim({ id: "Q18199165" })],
            P170: [
              { ...claim(null), qualifiers: { P2093: [{ datavalue: { value: "星の作者" } }] } },
            ],
          },
        },
      ]),
    );
    const run = Bun.spawn([
      "bun",
      path.resolve(import.meta.dirname, "dump-cli.ts"),
      "--metadata-dir",
      dir,
      "--articles",
      xml,
      "--pageviews",
      views,
      "--output",
      output,
    ]);
    expect(await run.exited).toBe(0);
    const summary =
      "星（ほし、star）は、宇宙の天体を表す言葉であり、この記事はその特徴を説明する。";
    const dumped = (await Bun.file(output).text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(dumped[0].metadata.image.credit).toBe("星の作者・CC BY-SA 4.0（Wikimedia Commons）");
    expect(dumped[0].metadata.categories).toEqual(["天体"]);
    expect(dumped[1].metadata.image).toBeNull();
    expect(dumped.map(({ metadata, ...article }) => article)).toEqual(
      [1, 2].map((id) => ({
        title: "星" + id,
        pageId: id,
        revisionId: id + 123,
        articleLength: 300,
        summary,
        monthlyPageviews: id === 1 ? 0 : 50000,
      })),
    );
    const fake = createFakeWikimedia({
      articles: [1, 2].map((id) => ({
        pageId: id,
        title: "記事" + id,
        extract: "この天体は" + "太陽系の惑星です。".repeat(4),
        revision: id * 10,
        wikidata: { id: "Q" + id, instanceOf: [{ id: "Q99", label: "惑星" }] },
      })),
    });
    const client = createWikimediaClient({ fetch: fake.fetch });
    const objects = new Map<string, Uint8Array>();
    const storage = {
      read: async (key: string) => objects.get(key) ?? null,
      put: async (key: string, data: Uint8Array) => {
        objects.set(key, data);
      },
    };
    await uploadImages(output, storage, client, db);
    expect(objects.size).toBe(0); // 画像がある1件目はコモン。
    const catalog = await importChunk(client, {
      pages: dumped,
      genres: new Map(),
      now: new Date(),
    });
    const part = decodePart(Uint8Array.from(encodePart(catalog)).buffer);
    expect(fake.requests).toHaveLength(0);
    expect(part.cards.map((c) => c.genre)).toEqual(["Q99", "Q99"]);
    expect(part.cards.map((c) => [c.title, c.summary, c.wikiRevisionId, c.articleLength])).toEqual(
      [1, 2].map((id) => ["星" + id, summary, id + 123, 300]),
    );
    for (let i = 0; i < 2; i++) await loadRecords(db, { ...part, thresholds: rarityThresholds });
    expect((await db.select().from(card)).map((c) => c.rarity)).toEqual(["common", "super_rare"]);
    // 保存済みのWebPを再取得せずに測定し、同じ記事・画像のカードだけを更新する。
    const rare = { ...dumped[0], monthlyPageviews: 50_000 };
    const key = await cardImageKey(rare.metadata.image.url);
    objects.set(
      key,
      await sharp({ create: { width: 17, height: 9, channels: 3, background: "red" } })
        .webp()
        .toBuffer(),
    );
    const imageInput = path.join(dir, "image-candidates.jsonl");
    await writeFile(imageInput, JSON.stringify(rare) + "\n");
    await uploadImages(imageInput, storage, client, db);
    const measured = (await db.select().from(card)).find((row) => row.wikiPageId === rare.pageId)!;
    expect([measured.imageWidth, measured.imageHeight]).toEqual([17, 9]);
    // 構造化データが不十分な同一画像は候補をまとめて補完する。
    await sqlDump(
      "page_props",
      ["pp_page", "pp_propname", "pp_value"],
      [
        "(1,'wikibase_item','Q1')",
        "(2,'wikibase_item','Q2')",
        "(1,'page_image_free','Unresolved.png')",
        "(2,'page_image_free','Unresolved.png')",
      ],
    );
    const imageApi = createFakeWikimedia({
      articles: [],
      images: [
        { file: "Unresolved.png", repository: "shared", license: "CC BY 4.0", artist: "作者" },
      ],
    });
    for (const offline of [true, false]) {
      const enriched = path.join(dir, "enriched-" + offline);
      await enrichDump(
        output,
        enriched,
        enriched + ".sqlite",
        dir,
        offline,
        createWikimediaClient({ fetch: imageApi.fetch }),
      );
      const rows = (await Bun.file(enriched).text())
        .trim()
        .split("\n")
        .map((row) => JSON.parse(row));
      expect(rows.map((row) => row.metadata.image?.credit ?? null)).toEqual(
        offline
          ? [null, null]
          : ["作者・CC BY 4.0（Wikimedia Commons）", "作者・CC BY 4.0（Wikimedia Commons）"],
      );
      expect(imageApi.requests).toHaveLength(offline ? 0 : 1);
    }
    await writeFile(output, "invalid\n");
    await expect(uploadImages(output, storage, client, db)).rejects.toThrow();
    expect(objects.size).toBe(1);
  } finally {
    await dispose();
    await rm(dir, { recursive: true, force: true });
  }
});
