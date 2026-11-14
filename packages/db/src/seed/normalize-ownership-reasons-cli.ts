// ローカル専用。既存の所有権履歴のreasonだけを更新する。--applyなしでは件数確認のみ。
import { parseArgs } from "node:util";
import { getPlatformProxy } from "wrangler";
import path from "node:path";
import { createDb } from "../index";
import { countOldOwnershipReasons, normalizeOwnershipReasons } from "./normalize-ownership-reasons";

const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
const root = path.resolve(import.meta.dirname, "../../../..");
// 移行・起動にデータ更新を紐付けず、既存のローカルDBだけを開く。
const proxy = await getPlatformProxy<{ DB: D1Database }>({
  configPath: path.join(root, "apps/web/wrangler.local.jsonc"),
  persist: { path: path.join(root, ".wrangler/state/v3") },
});
try {
  const db = createDb(proxy.env);
  console.log(
    `対象: ローカル user_card_ownership_transfers.reason、${await countOldOwnershipReasons(db)}件`,
  );
  if (values.apply) {
    console.log(
      `更新: ${await normalizeOwnershipReasons(db)}件、残り: ${await countOldOwnershipReasons(db)}件`,
    );
  } else {
    console.log("バックアップを確認し、--apply を付けて実行してください。");
  }
} finally {
  await proxy.dispose();
}
