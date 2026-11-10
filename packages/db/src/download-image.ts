import { commonsImageUrl, cardImageTypes } from "./card-image";
export type ImageFetch = (
  url: string,
  init: { headers: Record<string, string>; redirect: "manual"; signal: AbortSignal },
) => Promise<Response>;

export class UnusableImage extends Error {}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
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
      headers: {
        "User-Agent": "wiki-collection/0.1 (+https://github.com/matsupiee/wiki-collection)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      await res.body?.cancel();
      const location = res.headers.get("location");
      const next = location ? commonsImageUrl(new URL(location, url).href) : null;
      if (!next || ++redirects > 5) throw new UnusableImage("不正なリダイレクトです");
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
      const message = `画像を取得できません (HTTP ${res.status}, ${contentType}, 上限10MiB)`;
      if (res.ok || res.status === 404 || res.status === 410) throw new UnusableImage(message);
      throw new Error(message);
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_BYTES) throw new UnusableImage("画像が10MiBを超えています");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    if (size === 0) throw new UnusableImage("空の画像です");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, contentType };
  }
}
