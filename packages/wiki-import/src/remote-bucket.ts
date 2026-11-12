import { getPlatformProxy } from "wrangler";
import { setTimeout as delay } from "node:timers/promises";
import { createHash } from "node:crypto";

export async function withRemoteBindings<T>(
  configPath: string,
  run: (env: { CARD_IMAGES: R2Bucket; DB: D1Database }) => Promise<T>,
) {
  const proxy = await getPlatformProxy<{ CARD_IMAGES: R2Bucket; DB: D1Database }>({
    configPath,
    remoteBindings: true,
    persist: false,
  });
  try {
    return await run(proxy.env);
  } finally {
    await proxy.dispose();
  }
}

export async function uploadBackupParts(bucket: R2Bucket, key: string, file: Blob) {
  const upload = await bucket.createMultipartUpload(key, {
    httpMetadata: { contentType: "application/x-ndjson" },
  });
  const parts: R2UploadedPart[] = [];
  const checksum = createHash("md5");
  const partSize = 8 * 1024 * 1024;
  const count = Math.ceil(file.size / partSize);
  const hashes: Buffer[] = [];
  let next = 0;
  let completed = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < count) {
      const index = next++;
      const data = await file.slice(index * partSize, (index + 1) * partSize).arrayBuffer();
      hashes[index] = createHash("md5").update(new Uint8Array(data)).digest();
      for (let attempt = 1; ; attempt++) {
        try {
          parts[index] = await upload.uploadPart(index + 1, data);
          break;
        } catch (error) {
          if (attempt >= 8) {
            failed = true;
            throw error;
          }
          console.warn(`パート ${index + 1} を再送します (試行 ${attempt + 1})`);
          await delay(Math.min(30_000, 1_000 * 2 ** (attempt - 1)));
        }
      }
      if (++completed % 10 === 0 || completed === count) console.log(`${completed}/${count} parts`);
    }
  }
  try {
    const results = await Promise.allSettled(Array.from({ length: 3 }, worker));
    for (const result of results) if (result.status === "rejected") throw result.reason;
    for (const hash of hashes) checksum.update(hash);
    await upload.complete(parts);
  } catch (error) {
    await upload.abort().catch(() => {});
    throw error;
  }
  const head = await bucket.head(key);
  const expected = checksum.digest("hex") + "-" + parts.length;
  if (head?.size !== file.size || head.etag !== expected)
    throw new Error("バックアップのサイズまたはETagが一致しません");
  console.log(`検証済み: ${head.size} bytes, ETag ${head.etag}`);
}

if (import.meta.main) {
  const { openAsBlob } = await import("node:fs");
  const [config, key, input] = process.argv.slice(2);
  if (!config || !key || !input) throw new Error("設定、保存先、入力ファイルが必要です");
  const file = await openAsBlob(input);
  await withRemoteBindings(config, ({ CARD_IMAGES }) => uploadBackupParts(CARD_IMAGES, key, file));
}
