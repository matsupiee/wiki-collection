import path from "node:path";
import { parseArgs } from "node:util";
import { readCardStore } from "../../../wiki-import/src/card-store";
import { openLocalDb } from "./local-db";
import { seedWiki } from "./wiki";

// 未知の引数（--remoteなど）を拒否する。接続先を外部から指定できないローカル専用コマンド。
parseArgs({ options: {}, allowPositionals: false });
const store = await readCardStore(path.join(import.meta.dirname, "fixtures/ja"));
const { db, images, dispose } = await openLocalDb();
try {
  console.log("ローカルD1を初期化し、記事500件を登録します。");
  const result = await seedWiki({ db, images, store, log: console.log });
  console.log(
    `完了: wikiカード ${result.cards} 件、R2画像 ${result.images} 件。bun run dev:local で新規登録して基本パックを開けます。`,
  );
} finally {
  await dispose();
}
