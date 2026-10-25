// data/ja のジャンル、カード、レアリティの下限を、ローカルの D1 に入れる。
// 使い方: bun run wiki:load（ルート） または packages/wiki-import で bun run load
// bun run db:seed で D1 を作り直したら、もう一度実行する
import { openLocalDb } from "@wiki-collection/db/seed/local-db";

import { DATA_DIR } from "./card-store";
import { loadCards } from "./load-cards";

const { db, dispose } = await openLocalDb();
try {
  const result = await loadCards({ db, dataDir: DATA_DIR });
  console.log(
    `ジャンル ${result.genres} 個、カード ${result.cards} 枚を入れました${result.thresholds ? "。レアリティの下限も入れました" : ""}`,
  );
} finally {
  await dispose();
}
