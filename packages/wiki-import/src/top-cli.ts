// Wikimedia の閲覧数の dump から、日本語版の直近12か月の閲覧数の上位の記事を集め、.cache/top-pages-ja.tsv に書く。
// dump は1か月で数 GB あるので、ダウンロードしながら展開して読む。bzip2 コマンドが必要。
// 使い方: bun run wiki:top（ルート） または packages/wiki-import で bun run top
//   --limit <n>  一覧に入れる記事の数（既定 100000）
//   --file <path>  ダウンロード済みの月次 dump を使う。12 か月分を指定する。省略すると直近12か月分をダウンロードする
import { parseArgs } from "node:util";

import {
  monthlyDumpUrl,
  rankTopPages,
  readDumpLines,
  recentMonths,
  sumPageviews,
  TOP_PAGES_FILE,
  writeTopPages,
} from "./top-pages";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "100000" },
    file: { type: "string", multiple: true },
  },
});

const sources = values.file ?? recentMonths(new Date()).map(monthlyDumpUrl);
if (sources.length !== 12) throw new Error("--file には 12 か月分の dump を指定してください");

const totals = new Map<number, number>();
for (const source of sources) {
  console.log(`読んでいます: ${source}`);
  const matched = await sumPageviews(readDumpLines(source), { wikiCode: "ja.wikipedia", totals });
  if (matched === 0)
    throw new Error(`日本語版の行が見つかりません。dump の形式を確かめてください: ${source}`);
  console.log(`  ${matched} 行（いまの記事数 ${totals.size}）`);
}
const top = rankTopPages(totals, Number(values.limit));
await writeTopPages(TOP_PAGES_FILE, top);
console.log(`上位 ${top.length} 件を ${TOP_PAGES_FILE} に書きました`);
