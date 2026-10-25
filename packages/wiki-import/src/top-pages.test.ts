import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  monthlyDumpUrl,
  rankTopPages,
  readDumpLines,
  readTopPages,
  recentMonths,
  sumPageviews,
  writeTopPages,
} from "./top-pages";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "top-pages-"));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

async function* lines(...items: string[]) {
  yield* items;
}

describe("top-pages", () => {
  test("直近12か月（今月を除く）の dump の URL を作る", () => {
    const months = recentMonths(new Date("2026-10-25T00:00:00Z"));
    expect(months[0]).toBe("2025-10");
    expect(months[11]).toBe("2026-09");
    expect(monthlyDumpUrl("2026-09")).toBe(
      "https://dumps.wikimedia.org/other/pageview_complete/monthly/2026/2026-09/pageviews-202609-user.bz2",
    );
  });

  test("日本語版の行だけを page_id ごとに足し、12 で割った月平均の多い順に並べる", async () => {
    const totals = new Map<number, number>();
    const matched = await sumPageviews(
      lines(
        "ja.wikipedia 太陽 1 desktop 1200 A600B600",
        "ja.wikipedia 太陽 1 mobile-web 1200 A1200",
        "ja.wikipedia 月 2 desktop 1200 A1200",
        "en.wikipedia Sun 1 desktop 999999 A999999",
        "ja.wikipedia 削除済み null desktop 5000 A5000",
        "ja.wikibooks 本 3 desktop 5000 A5000",
        // アクセス方法の列がない形式
        "ja.wikipedia 火星 4 600 A600",
      ),
      { wikiCode: "ja.wikipedia", totals },
    );
    await sumPageviews(lines("ja.wikipedia 月 2 desktop 2400 A2400"), {
      wikiCode: "ja.wikipedia",
      totals,
    });

    expect(matched).toBe(4);
    expect(rankTopPages(totals, 2)).toEqual([
      { pageId: 2, monthlyPageviews: 300 },
      { pageId: 1, monthlyPageviews: 200 },
    ]);
  });

  test("bz2 の dump を展開しながら1行ずつ読み、一覧をファイルに読み書きする", async () => {
    const raw = path.join(dir, "dump.txt");
    await writeFile(
      raw,
      "ja.wikipedia 太陽 1 desktop 1200 A1200\nja.wikipedia 月 2 desktop 600 A600\n",
    );
    await Bun.spawn(["bzip2", "-k", raw]).exited;

    const read: string[] = [];
    for await (const line of readDumpLines(`${raw}.bz2`)) read.push(line);
    expect(read.filter((l) => l !== "")).toEqual([
      "ja.wikipedia 太陽 1 desktop 1200 A1200",
      "ja.wikipedia 月 2 desktop 600 A600",
    ]);

    const file = path.join(dir, "top.tsv");
    await writeTopPages(file, [{ pageId: 1, monthlyPageviews: 100 }]);
    expect(await readTopPages(file)).toEqual([{ pageId: 1, monthlyPageviews: 100 }]);
    await expect(readTopPages(path.join(dir, "none.tsv"))).rejects.toThrow("bun run wiki:top");
  });
});
