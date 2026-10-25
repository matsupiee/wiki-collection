// data/ja のカードの JSONL とレアリティの下限を、ローカルの D1 に入れる。
// 使い方: bun run wiki:load（ルート） または packages/wiki-import で bun run load
// ジャンルは seed で入るので、先に bun run db:seed を実行しておく
import { openLocalDb } from "@wiki-collection/db/seed/local-db";

import { DATA_DIR } from "./card-store";
import { loadCards } from "./load-cards";

const { db, dispose } = await openLocalDb();
try {
  const result = await loadCards({ db, dataDir: DATA_DIR });
  console.log(
    `カード ${result.cards} 枚を入れました${result.thresholds ? "。レアリティの下限も入れました" : ""}`,
  );
} finally {
  await dispose();
}
