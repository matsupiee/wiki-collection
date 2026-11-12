import { enrichDump } from "./enrich-dump";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { mkdir, rename, rm } from "node:fs/promises";
import { readLines } from "./read-lines";
import { Readable } from "node:stream";
import path from "node:path";
import { parseArgs } from "node:util";
import { monthlyDumpUrl, readDumpLines, recentMonths, sumPageviews } from "./top-pages";
import { USER_AGENT } from "./wikimedia-client";

import { leadSummary } from "./lead-summary";
import { z } from "zod";
import { dumpFile, dumpArticleFields } from "./dump-article";
const leadSchema = dumpArticleFields.extend({ lead: z.string() });
async function download(url: string, file: string) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok || !response.body) throw new Error(`ダンプ取得失敗: ${response.status} ${url}`);
  await pipeline(Readable.from(response.body), createWriteStream(file));
}
export async function dump() {
  const { values } = parseArgs({
    options: {
      articles: { type: "string" },
      "metadata-dir": { type: "string", default: "" },
      "offline-images": { type: "boolean", default: false },
      pageviews: { type: "string" },
      output: { type: "string", default: dumpFile },
    },
  });
  const output = values.output;
  await mkdir(path.dirname(output), { recursive: true });
  const temp = output + "." + crypto.randomUUID();
  const xml = values.articles ?? temp + ".xml.bz2";
  const views = values.pageviews ?? temp + ".views.bz2";
  try {
    if (!values.articles)
      await download(
        "https://dumps.wikimedia.org/jawiki/latest/jawiki-latest-pages-articles-multistream.xml.bz2",
        xml,
      );
    const totals = new Map<number, number>();
    const month = recentMonths(new Date(), 1)[0]!;
    if (!values.pageviews) await download(monthlyDumpUrl(month), views);
    if (
      !(await sumPageviews(readDumpLines(views), {
        wikiCode: "ja.wikipedia",
        totals,
      }))
    )
      throw new Error("日本語版の閲覧数がありません");
    const process = Bun.spawn(
      ["python3", path.join(import.meta.dirname, "article-leads.py"), xml],
      {
        stdout: "pipe",
        stderr: "inherit",
      },
    );
    const writer = Bun.file(temp + ".leads").writer();
    let count = 0;
    try {
      for await (const line of readLines(process.stdout)) {
        const { lead, ...article } = leadSchema.parse(JSON.parse(line));
        const summary = leadSummary(lead);
        writer.write(
          JSON.stringify({
            ...article,
            summary,
            monthlyPageviews: totals.get(article.pageId) ?? 0,
          }) + "\n",
        );
        count++;
      }
    } finally {
      await writer.end();
    }
    if ((await process.exited) || !count) throw new Error("記事ダンプの解析に失敗しました");
    totals.clear();
    await enrichDump(
      temp + ".leads",
      temp,
      temp + ".sqlite",
      values["metadata-dir"],
      values["offline-images"],
    );
    await rename(temp, output);
    console.log(`${count} 記事 → ${output}`);
  } finally {
    for (const suffix of ["", ".leads", ".sqlite"]) await rm(temp + suffix, { force: true });
    if (!values.articles) await rm(xml, { force: true });
    if (!values.pageviews) await rm(views, { force: true });
  }
}
if (import.meta.main) await dump();
