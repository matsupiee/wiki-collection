import { describe, expect, test } from "bun:test";

import { isFreeLicense } from "./fetch-image-licenses";
import { pageviewsRange } from "./fetch-monthly-pageviews";
import { getExclusionReason } from "./get-exclusion-reason";
import { createWikimediaClient, USER_AGENT } from "./wikimedia-client";

describe("createWikimediaClient", () => {
  test("429 と maxlag は待ってから再試行し、Retry-After があればその秒数だけ待つ", async () => {
    const responses = [
      new Response("", { status: 429, headers: { "Retry-After": "3" } }),
      Response.json({ error: { code: "maxlag" } }),
      Response.json({ ok: true }),
    ];
    const waits: number[] = [];
    const agents: (string | null)[] = [];
    const client = createWikimediaClient({
      fetch: (async (_url: string, init?: RequestInit) => {
        agents.push(new Headers(init?.headers).get("User-Agent"));
        return responses.shift()!;
      }) as unknown as typeof fetch,
      sleep: async (ms) => void waits.push(ms),
    });

    expect(await client.getJson<{ ok: boolean }>("https://example.org")).toEqual({ ok: true });
    expect(waits).toEqual([3000, 2000]);
    expect(agents).toEqual([USER_AGENT, USER_AGENT, USER_AGENT]);
  });

  test("404 は null を返し、そのほかのエラーは例外にする", async () => {
    const client = createWikimediaClient({
      fetch: (async (url: string) =>
        new Response("", {
          status: url.endsWith("missing") ? 404 : 400,
        })) as unknown as typeof fetch,
    });
    expect(await client.getJson("https://example.org/missing")).toBeNull();
    await expect(client.getJson("https://example.org/bad")).rejects.toThrow("400");
  });

  test("同時に投げるリクエストを concurrency 本までに抑える", async () => {
    let running = 0;
    let peak = 0;
    const client = createWikimediaClient({
      concurrency: 2,
      fetch: (async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return Response.json({});
      }) as unknown as typeof fetch,
    });
    await Promise.all(Array.from({ length: 6 }, () => client.getJson("https://example.org")));
    expect(peak).toBe(2);
  });
});

describe("pageviewsRange", () => {
  test("12か月前の月初から先月末までにする", () => {
    expect(pageviewsRange(new Date("2026-01-15T00:00:00Z"))).toEqual({
      start: "20250101",
      end: "20251231",
    });
  });
});

describe("isFreeLicense", () => {
  test("CC BY・CC BY-SA・CC0・パブリックドメインだけを通す", () => {
    for (const ok of ["CC BY-SA 4.0", "CC BY 2.0", "CC0", "Public domain", "PD-US"]) {
      expect(isFreeLicense(ok)).toBe(true);
    }
    for (const ng of ["CC BY-NC 4.0", "CC BY-ND 2.0", "All rights reserved", "Fair use", ""]) {
      expect(isFreeLicense(ng)).toBe(false);
    }
  });
});

describe("getExclusionReason", () => {
  const base = { title: "記事", categories: [], isDisambiguation: false };
  test("事件・事故のカテゴリに入っている記事を外す", () => {
    expect(getExclusionReason({ ...base, categories: ["日本の鉄道事故"] })).toBe("事件・事故");
  });
  test("存命人物の記事は外さない", () => {
    expect(
      getExclusionReason({ ...base, categories: ["存命人物", "日本の宇宙飛行士"] }),
    ).toBeNull();
  });
  test("要約を取る前は、要約の長さで判定しない", () => {
    expect(getExclusionReason(base)).toBeNull();
  });
});
