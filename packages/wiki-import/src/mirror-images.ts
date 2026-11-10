import { cardImageKey, commonsImageUrl } from "@wiki-collection/db/card-image";
import { encodeCardWebp } from "./card-webp";
import type { CardRecord } from "./card-store";
import { downloadImage, UnusableImage, type ImageFetch } from "@wiki-collection/db/download-image";
export {
  downloadImage,
  MAX_IMAGE_BYTES,
  type ImageFetch,
} from "@wiki-collection/db/download-image";

export type ImageStorage = {
  exists(key: string): Promise<boolean>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
};

// 各ワーカーは転送完了後に1秒空ける。同時に保持する画像数も制限する。
export async function mirrorImages(input: {
  onUnavailable?: (url: string) => void;
  cards: Pick<CardRecord, "imageUrl" | "imageCredit">[];
  storage: ImageStorage;
  limit?: number;
  concurrency?: number;
  fetch?: ImageFetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}) {
  const limit = input.limit ?? 1000;
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new Error("limit は1以上の整数にしてください");
  const concurrency = input.concurrency ?? 3;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new Error("concurrency は1〜8の整数にしてください");
  const doFetch = input.fetch ?? fetch;
  const sleep = input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const log = input.log ?? (() => {});
  const result = { uploaded: 0, existing: 0, failed: 0, skipped: 0 };
  const seen = new Set<string>();
  let attempted = 0;
  const cards = input.cards.values();
  let stopped = false;
  async function worker() {
    try {
      while (!stopped && attempted < limit) {
        const next = cards.next();
        if (next.done) return;
        const card = next.value;
        if (!card.imageUrl || !card.imageCredit?.trim()) {
          result.skipped++;
          continue;
        }
        const source = commonsImageUrl(card.imageUrl);
        if (!source) {
          result.skipped++;
          continue;
        }
        // await より前に予約し、並列処理でも重複転送しない。
        if (seen.has(source)) continue;
        seen.add(source);
        const key = await cardImageKey(source);
        if (stopped) return;
        if (await input.storage.exists(key)) {
          result.existing++;
          continue;
        }
        // HEAD の待機中に別ワーカーが上限へ到達する場合もある。
        if (stopped || attempted >= limit) return;
        attempted++;
        try {
          const { bytes } = await downloadImage(source, doFetch, sleep);
          const webp = await encodeCardWebp(bytes).catch((error) => {
            throw new UnusableImage(String(error));
          });
          await input.storage.put(key, webp, "image/webp");
          result.uploaded++;
          log(`保存: ${key}`);
        } catch (error) {
          if (error instanceof UnusableImage && input.onUnavailable) {
            input.onUnavailable(source);
            result.skipped++;
          } else {
            result.failed++;
          }
          log(`失敗: ${source} (${error instanceof Error ? error.message : String(error)})`);
        }
        await sleep(1000);
      }
    } catch (error) {
      // 保存先の認証・接続エラーでは新規処理を止める。
      stopped = true;
      throw error;
    }
  }
  // 進行中の保存が終わってからエラーを返し、R2 接続の早期破棄を防ぐ。
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, () => worker()));
  const failure = workers.find((worker) => worker.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  return result;
}
