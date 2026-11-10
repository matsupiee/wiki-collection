import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { cardImageKey, cardImageDisplayUrl } from "@wiki-collection/db/card-image";

const source = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.png";
let mf: Miniflare;
let bucket: Awaited<ReturnType<Miniflare["getR2Bucket"]>>;
beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [path.resolve(import.meta.dirname, "../../test/image-worker.ts")],
    target: "browser",
  });
  if (!build.success) throw new Error(String(build.logs));
  mf = new Miniflare(
    convertV4MiniflareOptions({
      name: "image-test",
      routes: ["app.test/*"],
      modules: true,
      script: await build.outputs[0]!.text(),
      compatibilityDate: "2026-09-01",
      r2Buckets: ["CARD_IMAGES"],
    }),
  );
  bucket = await mf.getR2Bucket("CARD_IMAGES");
});
afterAll(async () => mf?.dispose());
const call = async (
  pathname: string,
  init?: { method?: string; headers?: Record<string, string> },
) =>
  fetch(new URL(pathname, await mf.ready), {
    ...init,
    headers: { ...init?.headers, Host: "app.test" },
    redirect: "manual",
  });
const request = (url = source, init?: { method?: string; headers?: Record<string, string> }) =>
  call(cardImageDisplayUrl(url), init);

describe("card image delivery", () => {
  test("保存前は元の Commons URL へ転送し、転送をキャッシュしない", async () => {
    const res = await request();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(source);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  test("R2 の画像バイトを返し、ETag と HEAD に対応する", async () => {
    const bytes = Uint8Array.from(
      Buffer.from(
        "UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoDAAMAAUAmJaACdLoB+AADsAD+82mX/mwIGaH0wf+mkeNI8aR8poAA",
        "base64",
      ),
    );
    await bucket.put(await cardImageKey(source), bytes, {
      httpMetadata: { contentType: "image/webp" },
    });
    const res = await request();
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const etag = res.headers.get("etag")!;
    const cached = await request(source, { headers: { "If-None-Match": `"other", W/${etag}` } });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");
    const head = await request(source, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe(String(bytes.length));
    expect(await head.text()).toBe("");
  });
  test("以前に保存したJPEGも同じURLから配信する", async () => {
    const legacy = source.replace("Test.png", "Legacy.jpg");
    await bucket.put(await cardImageKey(legacy), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    const res = await request(legacy, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });
  test("任意の URL や非画像オブジェクトを配信しない", async () => {
    for (const bad of [
      "http://localhost/image",
      "https://upload.wikimedia.org.evil.test/wikipedia/commons/a.png",
      "https://upload.wikimedia.org/wikipedia/en/a.png",
    ]) {
      expect((await call(`/api/card-images?source=${encodeURIComponent(bad)}`)).status).toBe(400);
    }
    await bucket.put(await cardImageKey(source), "<script>alert(1)</script>", {
      httpMetadata: { contentType: "text/html" },
    });
    expect((await request()).status).toBe(415);
  });
});
