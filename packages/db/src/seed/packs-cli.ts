import { openLocalDb } from "./local-db";
import { syncGuaranteedPacks } from "./packs";

const { db, dispose } = await openLocalDb();
try {
  await syncGuaranteedPacks(db);
  console.log("ジャンルパックの販売を終了し、確定ガチャ2種類を登録しました。");
} finally {
  await dispose();
}
