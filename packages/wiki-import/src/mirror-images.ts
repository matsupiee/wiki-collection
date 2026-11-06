import { cardImageKey, cardImageTypes, commonsImageUrl } from "@wiki-collection/db/card-image";
import type { CardRecord } from "./card-store";
import { USER_AGENT } from "./wikimedia-client";

export type ImageFetch = (
  url: string,
  init: { headers: Record<string, string>; redirect: "manual"; signal: AbortSignal },
) => Promise<Response>;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export type ImageStorage = {
  exists(key: string): Promise<boolean>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
};

// 各ワーカーは転送完了後に1秒空ける。同時に保持する画像数も制限する。
export async function mirrorImages(input: {
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
          const { bytes, contentType } = await downloadImage(source, doFetch, sleep);
          await input.storage.put(key, bytes, contentType);
          result.uploaded++;
          log(`保存: ${key}`);
        } catch (error) {
          result.failed++;
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

export async function downloadImage(
  source: string,
  doFetch: ImageFetch,
  sleep: (ms: number) => Promise<void>,
) {
  const initialUrl = commonsImageUrl(source);
  if (!initialUrl) throw new Error("取得を許可していない URL です");
  let url: string = initialUrl;
  let redirects = 0;
  let retries = 0;
  for (;;) {
    const res = await doFetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      await res.body?.cancel();
      const location = res.headers.get("location");
      const next = location ? commonsImageUrl(new URL(location, url).href) : null;
      if (!next || ++redirects > 5) throw new Error("不正なリダイレクトです");
      url = next;
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && retries < 3) {
      await res.body?.cancel();
      const retryAfter = res.headers.get("retry-after");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const wait = Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(retryAfter ?? "") - Date.now();
      await sleep(Math.max(1000 * 2 ** retries++, Number.isFinite(wait) ? wait : 0));
      continue;
    }
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (
      !res.ok ||
      !res.body ||
      !cardImageTypes.has(contentType) ||
      Number(res.headers.get("content-length")) > MAX_IMAGE_BYTES
    ) {
      await res.body?.cancel();
      throw new Error(`画像を取得できません (HTTP ${res.status}, ${contentType}, 上限10MiB)`);
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_BYTES) throw new Error("画像が10MiBを超えています");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    if (size === 0) throw new Error("空の画像です");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, contentType };
  }
}
