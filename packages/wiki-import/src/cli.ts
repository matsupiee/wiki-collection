// Wikipedia の記事を取り込んで、data/ja のカードの JSONL に書き足す。D1 へは bun run wiki:load で入れる。
// 使い方: bun run wiki:import（ルート） または packages/wiki-import で bun run import
//   --genre <slug>  取り込むジャンル。複数指定できる。省略するとすべてのジャンル
//   --depth <n>     サブカテゴリをたどる深さ（既定 1）
//   --max <n>       ジャンルごとに調べる記事の数の上限（既定 100）
import { parseArgs } from "node:util";

import { genres } from "@wiki-collection/db/seed/master-data";

import { DATA_DIR } from "./card-store";
import { importCards } from "./import-cards";
import { createWikimediaClient } from "./wikimedia-client";

const { values } = parseArgs({
  options: {
    genre: { type: "string", multiple: true },
    depth: { type: "string", default: "1" },
    max: { type: "string", default: "100" },
  },
});

const result = await importCards({
  client: createWikimediaClient(),
  dataDir: DATA_DIR,
  genres,
  genreSlugs: values.genre,
  depth: Number(values.depth),
  maxPagesPerGenre: Number(values.max),
  log: console.log,
});
if (result.createdThresholds) {
  console.log("レアリティの下限（月間閲覧数）を決めました:", result.createdThresholds);
}
for (const c of result.inserted) {
  console.log(`追加: [${c.genreSlug}] ${c.title}（${c.rarity}、月 ${c.monthlyPageviews} 閲覧）`);
}
for (const e of result.excluded) console.log(`除外: ${e.title}（${e.reason}）`);
console.log(
  `カードを ${result.inserted.length} 枚追加し、${result.excluded.length} 件を除外しました`,
);
if (result.inserted.length > 0) {
  console.log("差分を確かめてコミットし、bun run wiki:load でローカルの D1 に入れてください");
}
