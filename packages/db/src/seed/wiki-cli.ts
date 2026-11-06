import { parseArgs } from "node:util";
import { DATA_DIR, readCardStore } from "../../../wiki-import/src/card-store";
import { openLocalDb } from "./local-db";
import { seedWiki } from "./wiki";

// 未知の引数（--remoteなど）を拒否する。接続先を外部から指定できないローカル専用コマンド。
parseArgs({ options: {}, allowPositionals: false });
const store = await readCardStore(DATA_DIR);
const { db, images, dispose } = await openLocalDb();
try {
  console.log(
    "ローカルD1の全データとローカルR2の全画像を削除し、画像付きカード100件を登録します。",
  );
  const result = await seedWiki({ db, images, store, log: console.log });
  console.log(
    `完了: wikiカード ${result.cards} 件、R2画像 ${result.images} 件。bun run dev:local で新規登録して基本パックを開けます。`,
  );
} finally {
  await dispose();
}
