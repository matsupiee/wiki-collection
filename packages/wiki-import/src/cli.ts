// wiki:top で作った上位の記事の一覧を上から調べ、カードを data/ja の JSONL に書き足す。D1 へは bun run wiki:load で入れる。
// 使い方: bun run wiki:import（ルート） または packages/wiki-import で bun run import
//   --limit <n>  この取り込みで調べる記事の数の上限（既定 1000）。カードにも除外にもなっていない記事を、閲覧数の多い順に調べる
import { parseArgs } from "node:util";

import { DATA_DIR } from "./card-store";
import { importCards } from "./import-cards";
import { readTopPages, TOP_PAGES_FILE } from "./top-pages";
import { createWikimediaClient } from "./wikimedia-client";

const { values } = parseArgs({
  options: { limit: { type: "string", default: "1000" } },
});

const result = await importCards({
  client: createWikimediaClient(),
  dataDir: DATA_DIR,
  topPages: await readTopPages(TOP_PAGES_FILE),
  limit: Number(values.limit),
  log: console.log,
});
if (result.createdThresholds) {
  console.log("レアリティの下限（月間閲覧数）を決めました:", result.createdThresholds);
}
for (const c of result.inserted) {
  console.log(`追加: [${c.genre}] ${c.title}（${c.rarity}、月 ${c.monthlyPageviews} 閲覧）`);
}
for (const e of result.excluded) console.log(`除外: ${e.title}（${e.reason}）`);
console.log(
  `カードを ${result.inserted.length} 枚追加し、${result.excluded.length} 件を除外しました`,
);
if (result.inserted.length > 0) {
  console.log("差分を確かめてコミットし、bun run wiki:load でローカルの D1 に入れてください");
}
