import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fight } from "@wiki-collection/db/battle";
import { PageHeader } from "@/components/page-header";
import { CardStats } from "@/components/card-stats";
import { ElementBadge } from "@/components/element-badge";
import { MatchDetail, outcome } from "@/components/battle/match-detail";
import { secondary } from "@/components/battle/card-picker";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/battle_/$date/$teamId")({
  validateSearch: (search: Record<string, unknown>): { mine?: boolean } => ({
    mine: search.mine === true ? true : undefined,
  }),
  component: RankingDetailPage,
});

function RankingDetailPage() {
  const { date, teamId } = Route.useParams();
  const { mine } = Route.useSearch();
  const trpc = useTRPC();
  const ranking = useQuery(trpc.battle.ranking.queryOptions({ date }));
  const team = ranking.data?.ranking.find((entry) => entry.id === teamId);
  const opponents = ranking.data?.ranking.filter((entry) => entry.userId !== team?.userId) ?? [];
  const count = team ? team.wins + team.losses + team.draws : 0;
  return (
    <div className="pb-8">
      <PageHeader />
      <main className="space-y-6 px-4 pt-5">
        <Link
          to="/battle"
          search={{ tab: "ranking", date, mine }}
          className={`${secondary} inline-flex items-center`}
        >
          ← ランキングに戻る
        </Link>
        {ranking.isPending ? (
          <p role="status">対戦結果を読み込み中…</p>
        ) : ranking.isError ? (
          <div role="alert">
            <p>対戦結果を読み込めませんでした。</p>
            <button className={secondary} onClick={() => void ranking.refetch()}>
              再試行
            </button>
          </div>
        ) : !team ? (
          <p>このチームの対戦記録はありません。</p>
        ) : (
          <>
            <header>
              <p className="text-sm text-slate-500">
                {date}（日本時間） · {team.rank}位
              </p>
              <h1 className="mt-2 break-words text-2xl font-black">{team.name}</h1>
              <p className="mt-1 break-words text-sm text-slate-500">{team.player}</p>
            </header>
            <section aria-label="戦績" className="space-y-2 rounded-2xl bg-white p-4">
              <p className="text-xl font-bold text-sky-700">{team.points}点</p>
              <p>
                {team.wins}勝 {team.losses}敗 {team.draws}分 · {count}戦
              </p>
              <p>勝率 {count ? `${((team.wins / count) * 100).toFixed(1)}%` : "—"}</p>
              <p className="text-sm text-slate-500">
                勝点率 {count ? `${((team.points / (count * 3)) * 100).toFixed(1)}%` : "—"}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold">対戦時のカード</h2>
              <ol className="mt-2 divide-y divide-slate-200">
                {team.members.map((member, i) => (
                  <li key={`${member.id}-${i}`} className="space-y-2 py-4">
                    <p className="text-xs text-slate-500">{i + 1}番手</p>
                    <div className="flex items-center gap-2 font-bold">
                      <ElementBadge element={member.element} ruleVersion={team.ruleVersion ?? 1} />
                      <p className="min-w-0 break-words">{member.title}</p>
                    </div>
                    <CardStats {...member} ruleVersion={team.ruleVersion ?? 1} />
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-bold">対戦の内訳</h2>
              {opponents.map((opponent) => (
                <details key={opponent.id} className="border-t border-slate-200 py-3">
                  <summary className="cursor-pointer break-words py-2 text-sm font-bold">
                    {outcome(fight(team.members, opponent.members, team.ruleVersion ?? 1))} ·{" "}
                    {opponent.player} / {opponent.name}
                  </summary>
                  <MatchDetail
                    left={team.members}
                    right={opponent.members}
                    ruleVersion={team.ruleVersion ?? 1}
                    leftLabel={team.name}
                  />
                </details>
              ))}
              {!opponents.length && <p>この日は対戦相手がいませんでした。</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
