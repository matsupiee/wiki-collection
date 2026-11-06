import { runDailyBattles } from "../../../api/src/shared/battle/run-daily-battles";
import { openLocalDb } from "./local-db";
const { db, dispose } = await openLocalDb();
try {
  const day = await runDailyBattles(db);
  console.log(`${day.date}: ${day.ranking.length} チーム。保存済みの日は再集計しません。`);
} finally {
  await dispose();
}
