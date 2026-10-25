import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { USER_AGENT } from "./wikimedia-client";

// 閲覧数の上位の記事の一覧。dump から作り、git には入れない（.cache は .gitignore 済み）
export const TOP_PAGES_FILE = path.resolve(import.meta.dirname, "../.cache/top-pages-ja.tsv");

export type TopPage = { pageId: number; monthlyPageviews: number };

const MONTHS = 12;

// 直近12か月（今月を除く）の月を YYYY-MM で返す（UTC）
export function recentMonths(now: Date): string[] {
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

// 人による閲覧（user）の月次 dump。全言語・全プロジェクトの、閲覧のあったすべてのページが入っている。
// DOCS: https://dumps.wikimedia.org/other/pageview_complete/readme.html
export function monthlyDumpUrl(month: string) {
  const [year, mm] = month.split("-");
  return `https://dumps.wikimedia.org/other/pageview_complete/monthly/${year}/${month}/pageviews-${year}${mm}-user.bz2`;
}

// dump の1行は「wiki のコード 記事名 page_id アクセス方法 閲覧数 内訳」をスペースで区切ったもの。
// アクセス方法（desktop・mobile-web・mobile-app）ごとに行が分かれるので、page_id で足し合わせる。
// page_id が null の行（削除済みのページなど）は数えない。記事以外の名前空間も入っているので、取り込みで外す
export async function sumPageviews(
  lines: AsyncIterable<string>,
  input: { wikiCode: string; totals: Map<number, number> },
): Promise<number> {
  const prefix = `${input.wikiCode} `;
  let matched = 0;
  for await (const line of lines) {
    if (!line.startsWith(prefix)) continue;
    const fields = line.split(" ");
    const pageId = Number(fields[2]);
    // アクセス方法の列がない形式でも読めるよう、4列目が数字ならそれを閲覧数にする
    const views = Number(/^\d+$/.test(fields[3] ?? "") ? fields[3] : fields[4]);
    if (!Number.isInteger(pageId) || pageId <= 0 || !Number.isFinite(views)) continue;
    input.totals.set(pageId, (input.totals.get(pageId) ?? 0) + views);
    matched++;
  }
  return matched;
}

// 12か月の合計を 12 で割って月平均にし、多い順に limit 件を返す。閲覧のない月も 0 として数える
export function rankTopPages(totals: Map<number, number>, limit: number): TopPage[] {
  return [...totals]
    .map(([pageId, total]) => ({ pageId, monthlyPageviews: Math.round(total / MONTHS) }))
    .sort((a, b) => b.monthlyPageviews - a.monthlyPageviews || a.pageId - b.pageId)
    .slice(0, limit);
}

// bz2 の dump を bzip2 コマンドで展開しながら1行ずつ読む。source は URL かローカルのファイル
export async function* readDumpLines(source: string): AsyncGenerator<string> {
  const proc = Bun.spawn(["bzip2", "-dc"], {
    stdin: /^https?:/.test(source) ? await fetchBody(source) : Bun.file(source),
    stdout: "pipe",
    stderr: "inherit",
  });
  const decoder = new TextDecoder();
  let rest = "";
  for await (const chunk of proc.stdout) {
    const text = rest + decoder.decode(chunk, { stream: true });
    const lines = text.split("\n");
    rest = lines.pop()!;
    yield* lines;
  }
  if (rest) yield rest;
  const code = await proc.exited;
  if (code !== 0) throw new Error(`bzip2 が ${code} で終了しました: ${source}`);
}

async function fetchBody(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`dump を取れませんでした（${res.status}）: ${url}`);
  return res;
}

export async function writeTopPages(file: string, pages: TopPage[]) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, pages.map((p) => `${p.pageId}\t${p.monthlyPageviews}\n`).join(""));
}

export async function readTopPages(file: string): Promise<TopPage[]> {
  const text = await readFile(file, "utf8").catch(() => null);
  if (text === null) {
    throw new Error(`${file} がありません。先に bun run wiki:top を実行してください`);
  }
  return text
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [pageId, views] = line.split("\t");
      return { pageId: Number(pageId), monthlyPageviews: Number(views) };
    });
}
