import { describe, expect, test } from "bun:test";
import { cardImageKey, commonsImageUrl } from "@wiki-collection/db/card-image";
import {
  downloadImage,
  MAX_IMAGE_BYTES,
  mirrorImages,
  type ImageFetch,
  type ImageStorage,
} from "./mirror-images";

const source = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.png";
const card = (imageUrl: string | null = source) => ({
  imageUrl,
  imageCredit: "作者・CC BY-SA 4.0（Wikimedia Commons）",
});
const noWait = async () => {};
function storage() {
  const saved = new Map<string, { bytes: Uint8Array; type: string }>();
  const api: ImageStorage = {
    exists: async (key) => saved.has(key),
    put: async (key, bytes, type) => {
      saved.set(key, { bytes, type });
    },
  };
  return { saved, api };
}
const png = () =>
  new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
    headers: { "Content-Type": "image/png" },
  });

describe("mirrorImages", () => {
  test("画像を保存し、URL が同じカードと再実行では再取得しない。元データも変えない", async () => {
    const { saved, api } = storage();
    const cards = [card(), card(), card(null), { ...card(), imageCredit: null }];
    const before = JSON.stringify(cards);
    let calls = 0;
    const fetcher = (async (_url, init) => {
      calls++;
      expect(init.headers["User-Agent"]).toContain("wiki-collection");
      return png();
    }) as ImageFetch;
    const input = { cards, storage: api, fetch: fetcher, sleep: noWait };
    expect(await mirrorImages(input)).toEqual({ uploaded: 1, existing: 0, skipped: 2, failed: 0 });
    expect((await mirrorImages(input)).existing).toBe(1);
    expect(calls).toBe(1);
    expect(saved.get(await cardImageKey(source))?.type).toBe("image/png");
    expect(JSON.stringify(cards)).toBe(before);
  });
  test("並列転送は指定数以内で重なり、重複と試行上限を守る", async () => {
    const { api } = storage();
    const cards = Array.from({ length: 12 }, (_, i) => card(source.replace("Test", String(i))));
    let active = 0;
    let peak = 0;
    let calls = 0;
    const result = await mirrorImages({
      cards: cards.flatMap((entry) => [entry, entry]),
      storage: {
        ...api,
        put: async (...args) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          await api.put(...args);
          active--;
        },
      },
      limit: 5,
      concurrency: 3,
      sleep: noWait,
      fetch: async () => {
        calls++;
        peak = Math.max(peak, ++active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        return png();
      },
    });
    expect(result.uploaded).toBe(5);
    expect(calls).toBe(5);
    expect(peak).toBe(3);
    expect(active).toBe(0);
  });
  test("直列指定と不正な並列数を検証する", async () => {
    const { api } = storage();
    let active = 0;
    let peak = 0;
    const input = {
      cards: [card(), card(source.replace("Test", "Next"))],
      storage: api,
      sleep: noWait,
      fetch: async () => {
        peak = Math.max(peak, ++active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return png();
      },
    };
    await mirrorImages({ ...input, concurrency: 1 });
    expect(peak).toBe(1);
    for (const concurrency of [0, 9, 1.5, NaN])
      await expect(mirrorImages({ ...input, concurrency })).rejects.toThrow("concurrency");
  });
  test("保存先の検査で失敗しても進行中の転送が完了してから終了する", async () => {
    let started!: () => void;
    const downloading = new Promise<void>((resolve) => {
      started = resolve;
    });
    let saved = false;
    let checks = 0;
    await expect(
      mirrorImages({
        cards: [card(), card(source.replace("Test", "Next"))],
        concurrency: 2,
        storage: {
          exists: async () => {
            if (++checks === 1) return false;
            await downloading;
            throw new Error("R2 unavailable");
          },
          put: async () => {
            saved = true;
          },
        },
        fetch: async () => {
          started();
          await new Promise((resolve) => setTimeout(resolve, 10));
          return png();
        },
        sleep: noWait,
      }),
    ).rejects.toThrow("R2 unavailable");
    expect(saved).toBe(true);
  });
  test("thumb の画像と utm パラメータ付き URL を扱い、計測パラメータによる重複を防ぐ", async () => {
    const thumb = source.replace("upload.wikimedia.org", "thumb.wikimedia.org");
    expect(commonsImageUrl(`${thumb}?utm_source=ja.wikipedia.org&utm_campaign=imageinfo`)).toBe(
      thumb,
    );
    expect(await cardImageKey(`${source}?utm_source=test`)).toBe(await cardImageKey(source));
    expect(commonsImageUrl(`${source}?redirect=http://localhost`)).toBeNull();
  });
  test("limit は保存済みを数えず、再実行で次の画像に進む", async () => {
    const { api } = storage();
    const input = {
      cards: [card(), card(source.replace("Test", "Next"))],
      storage: api,
      limit: 1,
      fetch: (async () => png()) as ImageFetch,
      sleep: noWait,
    };
    expect((await mirrorImages(input)).uploaded).toBe(1);
    expect(await mirrorImages(input)).toMatchObject({ existing: 1, uploaded: 1 });
    await expect(mirrorImages({ ...input, limit: 0 })).rejects.toThrow("limit");
  });
  test("429 は Retry-After で待ち、500 はバックオフして再試行する", async () => {
    const waits: number[] = [];
    const responses = [
      new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
      new Response(null, { status: 500 }),
      png(),
    ];
    const result = await downloadImage(
      source,
      (async () => responses.shift()!) as ImageFetch,
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(result.contentType).toBe("image/png");
    expect(waits).toEqual([2000, 2000]);
  });
  test("失敗画像を保存せず、残りを続け、再実行で失敗分を再取得できる", async () => {
    const { api, saved } = storage();
    const result = await mirrorImages({
      cards: [card(), card(source.replace("Test", "Next"))],
      storage: api,
      sleep: noWait,
      fetch: (async (url) =>
        String(url) === source ? new Response(null, { status: 404 }) : png()) as ImageFetch,
    });
    expect(result).toMatchObject({ failed: 1, uploaded: 1 });
    expect(saved.has(await cardImageKey(source))).toBe(false);
    expect(
      (
        await mirrorImages({
          cards: [card()],
          storage: api,
          sleep: noWait,
          fetch: (async () => png()) as ImageFetch,
        })
      ).uploaded,
    ).toBe(1);
  });
  test("外部への転送、HTML、SVG、上限超過、空データは保存しない", async () => {
    const invalid = [
      () => new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/secret" } }),
      () => new Response("html", { headers: { "Content-Type": "text/html" } }),
      () => new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } }),
      () =>
        new Response(new Uint8Array(MAX_IMAGE_BYTES + 1), {
          headers: { "Content-Type": "image/png" },
        }),
      () => new Response("", { headers: { "Content-Type": "image/png" } }),
    ];
    for (const response of invalid)
      await expect(
        downloadImage(source, (async () => response()) as ImageFetch, noWait),
      ).rejects.toThrow();
    expect(
      commonsImageUrl("https://upload.wikimedia.org@evil.test/wikipedia/commons/a.png"),
    ).toBeNull();
    expect(
      commonsImageUrl("https://upload.wikimedia.org/wikipedia/commons/../../private"),
    ).toBeNull();
  });
});
