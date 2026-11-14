import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { user } from "../schema";
import { openLocalDb } from "./local-db";
import { seedQuestHistory } from "./quest-history";
import { listQuests, prepareQuestRewards } from "../quests/rewards";
const { values } = parseArgs({
  options: {
    "user-name": { type: "string" },
    seed: { type: "boolean" },
    apply: { type: "boolean" },
  },
});
if (!values["user-name"]) throw new Error("--user-name にローカルユーザー名を指定してください。");
const { db, dispose } = await openLocalDb();
try {
  const matches = await db.select().from(user).where(eq(user.name, values["user-name"])).limit(2);
  if (matches.length !== 1) throw new Error("ユーザーが一意に見つかりません。");
  const userId = matches[0]!.id;
  if (values.seed) await seedQuestHistory(db, userId);
  const pending = (await listQuests(db, userId)).filter(
    (q) => !q.completedAt && q.progress >= q.target,
  );
  console.log(
    `対象: ローカル ${matches[0]!.name}、未付与${pending.length}件、${pending.reduce((sum, q) => sum + q.reward, 0)}pt`,
  );
  if (values.apply) {
    const queries = prepareQuestRewards(db, userId, null);
    // 1ユーザーずつ、一括確定。再実行でも達成・入金の一意制約で増えない。
    await db.batch(queries as [(typeof queries)[number], ...typeof queries]);
    const remaining = (await listQuests(db, userId)).filter(
      (q) => !q.completedAt && q.progress >= q.target,
    );
    if (remaining.length) throw new Error("付与漏れがあります。");
    console.log("確認完了: 達成済み未付与0件");
  }
} finally {
  await dispose();
}
