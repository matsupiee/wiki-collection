import { runDailyBattles } from "../../../api/src/shared/battle/run-daily-battles";
import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";
const { db, dispose } = await openLocalDb();
try {
  await seedBattle(db, "battle-ux");
  await runDailyBattles(db, new Date("1999-12-31T15:00:00Z"));
  console.log(
    "UI確認専用: battle-ux1@example.com / battle-ux2@example.com、password1234。確認用の2000-01-01の結果を追加。既存利用者・保存済み結果は変更しません。",
  );
} finally {
  await dispose();
}
