import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../index";
import { coinDeposit, user, userQuestCompletion as completion } from "../schema";
import { questDefinitions } from "./definitions";

// 所有権履歴のreasonではなく、確定した開封結果だけを使う。売却・seed付与は進捗を変えない。
export function questMetric(userId: string, metric: string) {
  const base = sql`from pack_opening_card pc join pack_opening po on po.id = pc.pack_opening_id
    join card c on c.id = pc.card_id where po.user_id = ${userId}`;
  if (metric === "openings") return sql<number>`(select count(distinct po.id) ${base})`;
  if (metric === "cards") return sql<number>`(select count(distinct pc.card_id) ${base})`;
  if (metric === "genres") return sql<number>`(select count(distinct c.genre_id) ${base})`;
  return sql<number>`(select count(*) ${base} and c.rarity = ${metric})`;
}

// 呼び出し元の開封保存batchに含める。SQLの条件判定もbatch内で実行し、並行開封時の取りこぼしを防ぐ。
export function prepareQuestRewards(db: Database, userId: string, openingId: string | null) {
  return questDefinitions.flatMap((q) => [
    db
      .insert(completion)
      .select(
        db
          .select({
            // insert-selectは$defaultFnを呼ばないため、スキーマ自身の生成関数を使用する。
            id: sql<string>`${completion.id.defaultFn!()}`.as("id"),
            userId: user.id,
            questKey: sql<string>`${q.id}`.as("questKey"),
            reward: sql<number>`${q.reward}`.as("reward"),
            packOpeningId: sql<string | null>`${openingId}`.as("packOpeningId"),
          })
          .from(user)
          .where(and(eq(user.id, userId), sql`${questMetric(userId, q.metric)} >= ${q.target}`)),
      )
      .onConflictDoNothing({ target: [completion.userId, completion.questKey] }),
    db
      .insert(coinDeposit)
      .select(
        db
          .select({
            id: sql<string>`${coinDeposit.id.defaultFn!()}`.as("id"),
            userId: completion.userId,
            source: sql<"quest_reward">`'quest_reward'`.as("source"),
            isPaid: sql<boolean>`0`.as("isPaid"),
            amount: completion.reward,
            questCompletionId: completion.id,
            note: completion.questKey,
          })
          .from(completion)
          .where(and(eq(completion.userId, userId), eq(completion.questKey, q.id))),
      )
      .onConflictDoNothing({ target: coinDeposit.questCompletionId }),
  ]);
}

export async function listQuests(db: Database, userId: string) {
  const [metrics, completed] = await db.batch([
    db
      .select({
        openings: questMetric(userId, "openings"),
        cards: questMetric(userId, "cards"),
        genres: questMetric(userId, "genres"),
        rare: questMetric(userId, "rare"),
        super_rare: questMetric(userId, "super_rare"),
        legendary: questMetric(userId, "legendary"),
      })
      .from(user)
      .where(eq(user.id, userId)),
    db.select().from(completion).where(eq(completion.userId, userId)),
  ]);
  return questDefinitions.map((q) => {
    const done = completed.find((c) => c.questKey === q.id);
    const progress = Number(metrics[0]?.[q.metric as keyof (typeof metrics)[0]] ?? 0);
    return {
      ...q,
      progress: Math.min(progress, q.target),
      completedAt: done?.createdAt.toISOString() ?? null,
      reward: done?.reward ?? q.reward,
    };
  });
}
