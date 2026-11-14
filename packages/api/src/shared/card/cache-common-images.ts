import type { Database } from "@wiki-collection/db";
import { cardImageKey, commonsImageUrl } from "@wiki-collection/db/card-image";
import { downloadImage, type ImageFetch } from "@wiki-collection/db/download-image";
import { card } from "@wiki-collection/db/schema/index";
import { and, eq, inArray } from "drizzle-orm";

export async function cacheCommonImages(
  db: Database,
  ids: string[],
  bucket: R2Bucket,
  images: ImagesBinding,
  fetchImage: ImageFetch = fetch,
) {
  const rows = await db
    .select({
      id: card.id,
      url: card.imageUrl,
      credit: card.imageCredit,
      width: card.imageWidth,
      height: card.imageHeight,
    })
    .from(card)
    .where(and(inArray(card.rarity, ["common", "uncommon"]), inArray(card.id, ids)));
  const sources = new Set<string>();
  for (const row of rows) {
    const url = row.url && commonsImageUrl(row.url);
    if (url && row.credit?.trim()) sources.add(url);
  }
  // 10 MiB の入力と変換結果を同時に持つため、開封1回につき最大2画像ずつ処理する。
  const pending = sources.values();
  async function savePending() {
    for (const source of pending) {
      await save(source);
    }
  }
  async function save(source: string) {
    try {
      const key = await cardImageKey(source);
      const cards = rows.filter((row) => row.url && commonsImageUrl(row.url) === source);
      async function recordStoredSize(bytes?: ArrayBuffer) {
        if (!bytes) {
          const object = await bucket.get(key);
          if (!object || object.httpMetadata?.contentType !== "image/webp") return;
          bytes = await object.arrayBuffer();
        }
        const size = await images.info(new Blob([bytes]).stream());
        if (!("width" in size)) return;
        for (const row of cards) {
          if (row.width === size.width && row.height === size.height) continue;
          await db
            .update(card)
            .set({ imageWidth: size.width, imageHeight: size.height })
            .where(and(eq(card.id, row.id), eq(card.imageUrl, row.url!)));
        }
      }
      if (await bucket.head(key)) {
        if (cards.some((row) => row.width === null || row.height === null))
          await recordStoredSize();
        return;
      }
      const { bytes } = await downloadImage(
        source,
        fetchImage,
        (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      );
      for (const edge of [512, 320, 192, 96]) {
        const result = await images
          .input(new Blob([Uint8Array.from(bytes)]).stream())
          .transform({ width: edge, height: edge, fit: "scale-down" })
          .output({ format: "image/webp", quality: 75 });
        const output = await result.response().arrayBuffer();
        if (output.byteLength > 50_000) continue;
        const stored = await bucket.put(key, output, {
          httpMetadata: { contentType: "image/webp" },
          onlyIf: { etagDoesNotMatch: "*" },
        });
        // 並行処理で先に保存された場合は、R2にある方の画像を測る。
        await recordStoredSize(stored ? output : undefined);
        return;
      }
      throw new Error("変換後の画像が50KBを超えています");
    } catch (error) {
      console.error("コモン画像の保存失敗", source, String(error));
    }
  }
  await Promise.all([savePending(), savePending()]);
}
