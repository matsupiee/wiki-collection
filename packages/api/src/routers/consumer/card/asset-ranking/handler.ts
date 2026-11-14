import { sql } from "drizzle-orm";
import { card, user, userCard } from "@wiki-collection/db/schema/index";
import type { ProtectedContext } from "../../../../context";

export async function handler({ ctx }: { ctx: ProtectedContext }) {
  // 同じスナップショットから上位50人と、表示範囲外でも自分の順位を取得する。
  const rows = await ctx.db.all<{
    name: string;
    total: number;
    rank: number;
    position: number;
    mine: number;
  }>(sql`
    WITH totals AS (
      SELECT ${userCard.ownerId} AS owner,
        CAST(SUM(ROUND(
          170.2 * log2(1 + ${card.monthlyPageviews} / 60.0) +
          29.8 * log2(1 + coalesce(${card.articleLength}, 0) / 5259.0)
        )) AS INTEGER) AS total
      FROM ${userCard}
      JOIN ${card} ON ${card.id} = ${userCard.cardId}
      WHERE ${userCard.status} IN ('owned', 'listed')
      GROUP BY ${userCard.ownerId}
    ), ranked AS (
      SELECT owner, total, rank() OVER (ORDER BY total DESC) AS rank,
        row_number() OVER (ORDER BY total DESC, owner) AS position
      FROM totals
    )
    SELECT ${user.name} AS name, total, rank, position, owner = ${ctx.session.user.id} AS mine
    FROM ranked JOIN ${user} ON ${user.id} = owner
    WHERE position <= 50 OR owner = ${ctx.session.user.id}
    ORDER BY position
  `);
  const mine = rows.find((row) => row.mine);
  return {
    mine: mine ? { rank: mine.rank, total: mine.total } : null,
    leaders: rows
      .filter((row) => row.position <= 50)
      .map((row) => ({
        name: row.name,
        rank: row.rank,
        total: row.total,
        mine: Boolean(row.mine),
      })),
  };
}
