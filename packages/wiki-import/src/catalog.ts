import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import { cardRecordSchema, genreRecordSchema } from "./card-store";
import type { importChunk } from "./import-cards";

export const latestKey = "wiki-catalog/ja/latest.json";
export const manifestSchema = z.object({
  version: z.literal(1),
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
  parts: z.number().int().positive(),
  articles: z.number().int().positive(),
});
export function partKey(snapshot: string, index: number) {
  return `wiki-catalog/ja/v1/${snapshot}/${index}.jsonl.gz`;
}
type Part = Awaited<ReturnType<typeof importChunk>>;
export function encodePart(part: Part) {
  const rows = [
    JSON.stringify({ genres: part.newGenres, excluded: part.excluded }),
    ...part.cards.map((c) => JSON.stringify(c)),
  ];
  return gzipSync(rows.join("\n") + "\n");
}
export function decodePart(data: ArrayBuffer) {
  const [header, ...rows] = gunzipSync(new Uint8Array(data)).toString("utf8").trimEnd().split("\n");
  const genres = z.array(genreRecordSchema).parse(JSON.parse(header!).genres);
  return { genres, cards: rows.map((row) => cardRecordSchema.parse(JSON.parse(row))) };
}
export function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} が必要です`);
  return value;
}
export function catalogBucket() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("R2_ACCOUNT_ID が不正です");
  return new Bun.S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    bucket: requiredEnv("R2_BUCKET_NAME"),
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  });
}
