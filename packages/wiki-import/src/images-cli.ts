import { parseArgs } from "node:util";
import path from "node:path";
import { S3Client } from "bun";
import { getPlatformProxy } from "wrangler";
import { DATA_DIR, readCardStore } from "./card-store";
import { mirrorImages, type ImageStorage } from "./mirror-images";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "1000" },
    concurrency: { type: "string", default: "3" },
    remote: { type: "boolean", default: false },
  },
});
const limit = Number(values.limit);
if (!Number.isSafeInteger(limit) || limit < 1)
  throw new Error("--limit は1以上の整数にしてください");
const concurrency = Number(values.concurrency);
if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8)
  throw new Error("--concurrency は1〜8の整数にしてください");
const { cards } = await readCardStore(DATA_DIR);
let dispose = async () => {};
let storage: ImageStorage;
if (values.remote) {
  const required = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`--remote には環境変数 ${name} が必要です`);
    return value;
  };
  const accountId = required("R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("R2_ACCOUNT_ID が不正です");
  const bucket = required("R2_BUCKET_NAME");
  const client = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    bucket,
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  });
  console.log(`保存先: Cloudflare R2 (${bucket})`);
  storage = {
    exists: (key) => client.file(key).exists(),
    put: async (key, bytes, type) => {
      await client.file(key).write(bytes, { type });
    },
  };
} else {
  const root = path.resolve(import.meta.dirname, "../../..");
  const proxy = await getPlatformProxy<{ CARD_IMAGES: R2Bucket }>({
    configPath: path.join(root, "apps/web/wrangler.local.jsonc"),
    persist: { path: path.join(root, ".wrangler/state/v3") },
  });
  dispose = () => proxy.dispose();
  console.log("保存先: ローカル R2 (dev:local と共通)");
  storage = {
    exists: async (key) => (await proxy.env.CARD_IMAGES.head(key)) !== null,
    put: async (key, bytes, contentType) => {
      await proxy.env.CARD_IMAGES.put(key, bytes, { httpMetadata: { contentType } });
    },
  };
}
console.log(`同時実行数: ${concurrency}`);
try {
  const result = await mirrorImages({ cards, storage, limit, concurrency, log: console.log });
  console.log(
    `保存 ${result.uploaded} 件・保存済み ${result.existing} 件・対象外 ${result.skipped} 件・失敗 ${result.failed} 件`,
  );
  if (result.failed) process.exitCode = 1;
} finally {
  await dispose();
}
