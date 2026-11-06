import { eq, and, isNull } from "drizzle-orm";
import { readCardStore, DATA_DIR } from "../../../wiki-import/src/card-store";
import { runDailyBattles } from "../../../api/src/shared/battle/run-daily-battles";
import { card } from "../schema";
import { openLocalDb } from "./local-db";
import { seedBattle } from "./battle";
const { db, dispose } = await openLocalDb();
try {
  const store = await readCardStore(DATA_DIR);
  for (const c of store.cards) {
    if (c.articleLength != null)
      await db
        .update(card)
        .set({ articleLength: c.articleLength })
        .where(
          and(
            eq(card.wikiLang, "ja"),
            eq(card.wikiPageId, c.wikiPageId),
            isNull(card.articleLength),
          ),
        );
  }
  await seedBattle(db);
  const day = await runDailyBattles(db, new Date(Date.now() - 86400000));
  console.log(
    `対戦用利用者: battle1@example.com / battle2@example.com、パスワード: password1234。${day.date} の結果を保存しました。`,
  );
} finally {
  await dispose();
}
