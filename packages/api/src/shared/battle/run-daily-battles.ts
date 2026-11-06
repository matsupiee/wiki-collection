import type { Database } from "@wiki-collection/db";
import {
  currentBattleRuleVersion,
  elementOf,
  fight,
  type DailyRanking,
  type TeamSnapshot,
} from "@wiki-collection/db/battle";
import {
  battleDay,
  battleTeam,
  card,
  genre,
  user,
  userCard,
} from "@wiki-collection/db/schema/index";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { toJstDate } from "../pack/to-jst-date";

export function rankTeams(teams: TeamSnapshot[]): DailyRanking {
  const ranking: DailyRanking = teams.map((t) => ({
    ...t,
    rank: 0,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  }));
  // 毎日の総当たり。同じプレイヤーのチーム同士は対戦しない。
  for (let i = 0; i < ranking.length; i++) {
    for (let j = i + 1; j < ranking.length; j++) {
      const a = ranking[i]!,
        b = ranking[j]!;
      if (a.userId === b.userId) continue;
      const result = fight(a.members, b.members);
      if (result === 0) {
        a.draws++;
        b.draws++;
        a.points++;
        b.points++;
      } else {
        const winner = result > 0 ? a : b,
          loser = result > 0 ? b : a;
        winner.wins++;
        winner.points += 3;
        loser.losses++;
      }
    }
  }
  // 対戦数の違いで不利にならないよう獲得可能な勝点に対する割合で順位を決める。
  const score = (r: DailyRanking[number]) =>
    r.points / Math.max(1, 3 * (r.wins + r.draws + r.losses));
  ranking.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  ranking.forEach((r, i) => {
    r.rank = i > 0 && score(r) === score(ranking[i - 1]!) ? ranking[i - 1]!.rank : i + 1;
  });
  return ranking;
}

export async function runDailyBattles(db: Database, now = new Date()) {
  const date = toJstDate(now);
  const [existing] = await db.select().from(battleDay).where(eq(battleDay.date, date));
  if (existing) return existing;
  // 1つの SELECT でチームとカードをスナップショット。編成変更・合成が途中で混ざらない。
  const rows = await db
    .select({ team: battleTeam, player: user.name, copy: userCard, card, genreSlug: genre.slug })
    .from(battleTeam)
    .innerJoin(user, eq(user.id, battleTeam.userId))
    .innerJoin(
      userCard,
      sql`${userCard.id} in (${battleTeam.member1}, ${battleTeam.member2}, ${battleTeam.member3})`,
    )
    .innerJoin(card, eq(card.id, userCard.cardId))
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(
      and(
        eq(userCard.userId, battleTeam.userId),
        eq(userCard.status, "owned"),
        isNotNull(card.articleLength),
      ),
    );
  const teams = new Map<string, TeamSnapshot>();
  for (const row of rows) {
    const t = row.team;
    let snapshot = teams.get(t.id);
    if (!snapshot) {
      snapshot = {
        ruleVersion: currentBattleRuleVersion,
        id: t.id,
        userId: t.userId,
        player: row.player,
        name: t.name,
        members: [],
      };
      teams.set(t.id, snapshot);
    }
    const position = [t.member1, t.member2, t.member3].indexOf(row.copy.id);
    snapshot.members[position] = {
      id: row.copy.id,
      title: row.card.title,
      attack: row.card.monthlyPageviews + row.copy.attackBonus,
      defense: row.card.articleLength! + row.copy.defenseBonus,
      element: elementOf(row.genreSlug),
    };
  }
  const ranking = rankTeams(
    [...teams.values()].filter((t) => t.members.filter(Boolean).length === 3),
  );
  // 日付の UNIQUE 制約で再実行・同時実行を冪等にする。公開は結果全体を1回で保存する。
  await db
    .insert(battleDay)
    .values({ date, ranking })
    .onConflictDoNothing({ target: battleDay.date });
  const [saved] = await db.select().from(battleDay).where(eq(battleDay.date, date));
  return saved!;
}
