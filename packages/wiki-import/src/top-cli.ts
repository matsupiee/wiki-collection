// Wikimedia の閲覧数の dump から、日本語版の直近の閲覧数の上位の記事を集め、.cache/top-pages-ja.tsv に書く。
// dump は1か月で数 GB あるので、ダウンロードしながら展開して読む。bzip2 コマンドが必要。
// 使い方: bun run wiki:top（ルート） または packages/wiki-import で bun run top
//   --months <n>   直近何か月分（今月を除く）の月平均で数えるか（既定 1）
//   --limit <n>    一覧に入れる記事の数（既定 100000）
//   --file <path>  ダウンロード済みの月次 dump を使う。複数指定でき、指定した数を月数とする。省略すると直近 --months か月分をダウンロードする
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
    months: { type: "string", default: "1" },
    limit: { type: "string", default: "100000" },
    file: { type: "string", multiple: true },
  },
});

const months = Number(values.months);
if (!values.file && !(Number.isInteger(months) && months >= 1)) {
  throw new Error("--months には 1 以上の整数を指定してください");
}
const sources = values.file ?? recentMonths(new Date(), months).map(monthlyDumpUrl);

const totals = new Map<number, number>();
for (const source of sources) {
  console.log(`読んでいます: ${source}`);
  const matched = await sumPageviews(readDumpLines(source), { wikiCode: "ja.wikipedia", totals });
  if (matched === 0)
    throw new Error(`日本語版の行が見つかりません。dump の形式を確かめてください: ${source}`);
  console.log(`  ${matched} 行（いまの記事数 ${totals.size}）`);
}
const top = rankTopPages(totals, { months: sources.length, limit: Number(values.limit) });
await writeTopPages(TOP_PAGES_FILE, top);
console.log(
  `${sources.length} か月の月平均で、上位 ${top.length} 件を ${TOP_PAGES_FILE} に書きました`,
);
