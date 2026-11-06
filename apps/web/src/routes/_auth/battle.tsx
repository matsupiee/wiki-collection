import { ElementBadge } from "@/components/element-badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  affinityRules,
  elements,
  MAX_FUSION_MATERIALS,
  fight,
  type Fighter,
  type RankEntry,
} from "@wiki-collection/db/battle";
import { CardStats, StatIcon, statNumber } from "@/components/card-stats";
import { PageHeader } from "@/components/page-header";
import { BattleSheet } from "@/components/battle/battle-sheet";
import {
  CardIdentity,
  FusionCardPicker,
  action,
  field,
  secondary,
  type BattleCard,
} from "@/components/battle/card-picker";
import { SelectedTeamCards, TeamCardPicker } from "@/components/battle/team-card-picker";
import { toggleTeamMember } from "@/components/battle/team-selection";
import { groupFusionMaterials } from "@/components/battle/fusion-materials";
import { FusionMaterialPicker } from "@/components/battle/fusion-material-picker";
import { MatchDetail, outcome } from "@/components/battle/match-detail";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/battle")({ component: BattlePage });
const sample: Fighter[] = [
  {
    id: "sample-1",
    title: "練習用・人物カード",
    attack: 100000,
    defense: 50000,
    element: "person",
  },
  {
    id: "sample-2",
    title: "練習用・自然カード",
    attack: 100000,
    defense: 50000,
    element: "nature",
  },
  {
    id: "sample-3",
    title: "練習用・文化カード",
    attack: 100000,
    defense: 50000,
    element: "culture",
  },
];
function fighters(cards: BattleCard[]): Fighter[] {
  return cards
    .filter((c): c is BattleCard & { defense: number } => c.defense !== null)
    .map(({ id, title, attack, defense, element }) => ({ id, title, attack, defense, element }));
}
function BattlePage() {
  const trpc = useTRPC(),
    client = useQueryClient();
  const { session } = Route.useRouteContext();
  const inventory = useQuery(trpc.battle.inventory.queryOptions());
  const teams = useQuery(trpc.battle.teams.queryOptions());
  const [tab, setTab] = useState<"teams" | "ranking">("teams");
  const [sheet, setSheet] = useState<"team" | "fusion" | "practice" | null>(null);
  const [slot, setSlot] = useState(1),
    [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [practiceTeamId, setPracticeTeamId] = useState("");
  const [original, setOriginal] = useState(""),
    [discard, setDiscard] = useState(false);
  const [baseId, setBaseId] = useState(""),
    [materialIds, setMaterialIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false),
    [removeSlot, setRemoveSlot] = useState<number | null>(null);
  const [result, setResult] = useState<{
    attackGain: number;
    defenseGain: number;
    materialCount: number;
  } | null>(null);
  const [date, setDate] = useState(""),
    [mineOnly, setMineOnly] = useState(false);
  const [detail, setDetail] = useState<RankEntry | null>(null);
  const [practice, setPractice] = useState(false),
    [opponentId, setOpponentId] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const ranking = useQuery(trpc.battle.ranking.queryOptions({ date: date || undefined }));
  const latest = useQuery(trpc.battle.ranking.queryOptions({}));
  const onError = (error: { message: string }) => toast.error(error.message);
  const save = useMutation(
    trpc.battle.saveTeam.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries();
        setSheet(null);
        toast.success("チームを保存しました。次の定期対戦に参加します");
      },
      onError,
    }),
  );
  const remove = useMutation(
    trpc.battle.deleteTeam.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries();
        setRemoveSlot(null);
        toast.success("チームを解除しました");
      },
      onError,
    }),
  );
  const fuse = useMutation(
    trpc.battle.fuse.mutationOptions({
      onSuccess: async (data) => {
        await client.invalidateQueries();
        setConfirm(false);
        setMaterialIds([]);
        setResult(data);
      },
      onError,
    }),
  );
  const cards = inventory.data ?? [],
    savedTeams = teams.data ?? [];
  const ready = !inventory.isPending && !teams.isPending && !inventory.isError && !teams.isError;
  const base = cards.find((c) => c.id === baseId);
  const materialGroups = groupFusionMaterials(cards, baseId);
  const eligibleIds = new Set(materialGroups.flatMap((g) => g.available.map((c) => c.id)));
  const selectedGroups = materialGroups
    .map((g) => ({ ...g, count: g.available.filter((c) => materialIds.includes(c.id)).length }))
    .filter((g) => g.count > 0);
  const editing = savedTeams.some((t) => t.slot === slot);
  const selected = members.map((id) => cards.find((c) => c.id === id));
  const complete =
    selected.length === 3 &&
    selected.every((c) => c && c.defense !== null) &&
    new Set(members).size === 3;
  const mine = (ranking.data?.ranking ?? []).filter((t) => t.userId === session.user.id);
  const opponents = (latest.data?.ranking ?? []).filter(
    (t) =>
      t.ruleVersion === 2 &&
      t.userId !== session.user.id &&
      t.members.every((m) => elements.some((e) => e === m.element)),
  );
  const practiceTeam = savedTeams.find((t) => t.id === practiceTeamId);
  const practiceCards = practiceTeam
    ? [practiceTeam.member1, practiceTeam.member2, practiceTeam.member3]
        .map((id) => cards.find((c) => c.id === id))
        .filter((c) => !!c)
    : [];
  const opponent = opponents.find((t) => t.id === opponentId);
  const openTeam = (value: number) => {
    const saved = savedTeams.find((t) => t.slot === value);
    const nextName = saved?.name ?? `チーム${value}`;
    const nextMembers = saved ? [saved.member1, saved.member2, saved.member3] : [];
    save.reset();
    setSlot(value);
    setName(nextName);
    setMembers(nextMembers);
    setOriginal(JSON.stringify([nextName, nextMembers]));
    setDiscard(false);
    setPractice(false);
    setOpponentId("");
    setSheet("team");
  };
  const openFusion = (id = "") => {
    fuse.reset();
    setBaseId(id);
    setMaterialIds([]);
    setConfirm(false);
    setResult(null);
    setSheet("fusion");
  };
  const closeSheet = () => {
    if (save.isPending || fuse.isPending) return;
    if (sheet === "team" && JSON.stringify([name, members]) !== original) {
      setDiscard(true);
      return;
    }
    if (confirm) {
      setConfirm(false);
      return;
    }
    setSheet(null);
  };
  const swap = (i: number, j: number) => {
    setMembers((old) => {
      const next = [...old];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
    setPractice(false);
  };
  const nextMidnight = now
    ? (Math.floor((now + 9 * 3600000) / 86400000) + 1) * 86400000 - 9 * 3600000
    : null;
  const remaining = now && nextMidnight ? Math.ceil((nextMidnight - now) / 60000) : 0;
  const canFuse =
    !!base &&
    base.defense !== null &&
    materialIds.length > 0 &&
    materialIds.length <= MAX_FUSION_MATERIALS &&
    materialIds.every((id) => eligibleIds.has(id)) &&
    !fuse.isPending &&
    ready;
  return (
    <div className="pb-8">
      <PageHeader />
      <div className="space-y-6 px-4 pt-5">
        <header>
          <p className="text-xs font-semibold tracking-widest text-sky-700">DAILY BATTLE</p>
          <h1 className="mt-1 text-2xl font-black">チームと対戦</h1>
          <p className="mt-2 text-sm text-slate-600">3枚で挑む、毎日の自動対戦。</p>
        </header>
        <section aria-label="参加状況" className="border-l-2 border-sky-500 pl-4 text-sm">
          <p className="font-bold">
            {ready ? `${savedTeams.length} / 3チーム 参加予定` : "参加状況を確認中…"}
          </p>
          <p className="mt-1 text-slate-600">
            次回{" "}
            {nextMidnight
              ? new Intl.DateTimeFormat("ja-JP", {
                  timeZone: "Asia/Tokyo",
                  month: "numeric",
                  day: "numeric",
                }).format(nextMidnight)
              : ""}{" "}
            0:00（日本時間）
            {now ? ` · あと${Math.floor(remaining / 60)}時間${remaining % 60}分` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            保存したチームは毎日自動参加。変更は次回から反映されます。
          </p>
          {latest.data && (
            <button
              className="mt-2 min-h-11 text-sm font-semibold text-sky-700"
              onClick={() => {
                setDate("");
                setMineOnly(true);
                setTab("ranking");
              }}
            >
              {latest.data.date} の自分の結果を見る →
            </button>
          )}
        </section>
        <nav aria-label="対戦メニュー" className="flex border-b border-slate-200">
          {(
            [
              ["teams", "チーム"],
              ["ranking", "ランキング"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
              className={`min-h-12 flex-1 border-b-2 text-sm font-bold ${tab === key ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {(inventory.isError || teams.isError) && (
          <p role="alert" className="text-sm text-red-700">
            読み込めませんでした。
            <button
              className="min-h-11 px-3 underline"
              onClick={() => {
                void inventory.refetch();
                void teams.refetch();
              }}
            >
              再試行
            </button>
          </p>
        )}
        {tab === "teams" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">マイチーム</h2>
              <button
                className={action}
                disabled={!ready || savedTeams.length >= 3}
                onClick={() =>
                  openTeam([1, 2, 3].find((n) => !savedTeams.some((t) => t.slot === n))!)
                }
              >
                <Plus size={16} className="mr-1 inline" />
                チームを編成
              </button>
            </div>
            {!ready && !teams.isError && (
              <p role="status" className="text-sm text-slate-500">
                カードとチームを読み込み中…
              </p>
            )}
            {ready && !savedTeams.length && (
              <div className="py-6 text-center">
                <p className="font-bold">最初のチームを作ろう</p>
                <p className="mt-2 text-sm text-slate-600">
                  好きな3枚を選んで、練習対戦で試せます。
                </p>
              </div>
            )}
            {savedTeams.length === 3 && (
              <p className="text-xs text-slate-500">
                3チーム登録済みです。変更は各チームの「編集」から行えます。
              </p>
            )}
            {savedTeams.map((t) => (
              <article key={t.id} className="rounded-2xl bg-white p-4">
                <header className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 break-words font-bold">
                    {t.slot}. {t.name}
                  </h3>
                  <button
                    className={`${secondary} shrink-0`}
                    onClick={() => openTeam(t.slot)}
                    disabled={!ready}
                  >
                    編集
                  </button>
                </header>
                <ol className="mt-2 divide-y divide-slate-100">
                  {[t.member1, t.member2, t.member3].map((id, i) => {
                    const c = cards.find((c) => c.id === id);
                    return (
                      <li key={id} className="py-4">
                        {c ? (
                          <>
                            <p className="mb-2 text-xs font-semibold text-slate-500">{i + 1}番手</p>
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <CardIdentity card={c} linkToDetail />
                              </div>
                              <button
                                className={`${secondary} flex size-11 shrink-0 items-center justify-center p-0`}
                                aria-label={`${c.title}を強化`}
                                title="強化"
                                onClick={() => openFusion(c.id)}
                                disabled={!ready}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <rect x="5" y="2" width="14" height="20" rx="2" />
                                  <path d="M12 17V7m-4 4 4-4 4 4" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          "カードを読み込み中…"
                        )}
                      </li>
                    );
                  })}
                </ol>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <button
                    className={secondary}
                    disabled={!ready}
                    onClick={() => {
                      setPracticeTeamId(t.id);
                      setPractice(false);
                      setOpponentId("");
                      setSheet("practice");
                    }}
                  >
                    練習対戦
                  </button>
                  <button
                    className="min-h-11 px-2 text-xs text-slate-500"
                    onClick={() => setRemoveSlot(t.slot)}
                  >
                    チームを解除
                  </button>
                </div>
              </article>
            ))}
            <button
              className={`${secondary} w-full`}
              disabled={!ready || !cards.length}
              onClick={() => openFusion()}
            >
              <Sparkles size={16} className="mr-2 inline" />
              所持カードを強化
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              編成中のカードは出品・還元・強化素材に使えません。同じ1枚を複数チームに使えます。
            </p>
            {ready && cards.filter((c) => c.defense !== null).length < 3 && (
              <p className="text-sm text-slate-600">
                編成には能力値を計測済みのカードが3枚必要です。
                <Link to="/packs" className="block py-3 text-sky-700">
                  パックでカードを集める →
                </Link>
              </p>
            )}
          </div>
        )}
        {tab === "ranking" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold">日次ランキング</h2>
            <label className="block text-sm">
              対戦日（日本時間）
              <input
                className={field}
                type="date"
                aria-label="対戦日"
                value={date || ranking.data?.date || ""}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDetail(null);
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className={secondary}
                onClick={() => {
                  setDate("");
                  setDetail(null);
                }}
              >
                最新の結果
              </button>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                />
                自分のチームだけ
              </label>
            </div>
            <p className="text-xs text-slate-500">
              勝ち3点・引き分け1点。勝点率＝勝点 ÷（対戦数 ×
              3）で順位を決めます。同率は同順位。対戦報酬はありません。
            </p>
            {ranking.isPending ? (
              <p role="status">集計結果を読み込み中…</p>
            ) : ranking.isError ? (
              <p role="alert">
                ランキングを読み込めませんでした。
                <button className={secondary} onClick={() => void ranking.refetch()}>
                  再試行
                </button>
              </p>
            ) : !ranking.data?.ranking.length ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {date
                  ? "この日の対戦記録はありません。別の日付か最新の結果を選んでください。"
                  : "まだ対戦記録がありません。次回の開催後に確認してください。"}
              </p>
            ) : (
              <>
                {ranking.data.ranking.some((t) => t.ruleVersion !== 2) && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    この日は旧属性ルールの対戦結果です。内訳も当時の属性で表示します。
                  </p>
                )}
                {!mine.length && (
                  <p className="text-sm text-slate-600">
                    この日に参加した自分のチームはありません。現在の編成は次回に反映されます。
                  </p>
                )}
                {!!mine.length && (
                  <p className="text-sm font-semibold text-sky-800">
                    自分の成績：{mine.map((t) => `${t.name} ${t.rank}位`).join(" / ")}
                  </p>
                )}
                <ol className="divide-y divide-slate-200">
                  {(mineOnly ? mine : ranking.data.ranking).map((r) => {
                    const count = r.wins + r.losses + r.draws,
                      isMine = r.userId === session.user.id;
                    return (
                      <li
                        key={r.id}
                        className={`py-4 ${isMine ? "border-l-2 border-sky-600 pl-3" : ""}`}
                      >
                        <div className="flex gap-3">
                          <span className="text-xl font-black text-sky-700">{r.rank}</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words font-bold">
                              {r.name}{" "}
                              {isMine && <span className="text-xs text-sky-700">自分</span>}
                            </h3>
                            <p className="text-xs text-slate-500">{r.player}</p>
                            <p className="mt-2 text-sm">
                              {r.wins}勝 {r.losses}敗 {r.draws}分 · {count}戦
                            </p>
                            <p className="text-sm">
                              勝点率{" "}
                              {count ? `${((r.points / (count * 3)) * 100).toFixed(1)}%` : "—"} ·{" "}
                              {r.points}点
                            </p>
                            <details className="mt-3 text-xs">
                              <summary className="cursor-pointer py-2">対戦時のカード</summary>
                              {r.members.map((m, i) => (
                                <div key={m.id} className="mt-2">
                                  <div className="flex items-center gap-1 font-semibold">
                                    <ElementBadge
                                      element={m.element}
                                      ruleVersion={r.ruleVersion ?? 1}
                                    />
                                    <p>
                                      {i + 1}番手 · {m.title}
                                    </p>
                                  </div>
                                  <CardStats {...m} ruleVersion={r.ruleVersion ?? 1} />
                                </div>
                              ))}
                            </details>
                            {isMine && (
                              <button className={`${secondary} mt-2`} onClick={() => setDetail(r)}>
                                対戦の内訳を見る
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>
        )}
        <details className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
          <summary className="min-h-11 cursor-pointer font-semibold">能力値と対戦ルール</summary>
          <p>
            <StatIcon stat="attack" /> は取り込み時の月間閲覧数、
            <StatIcon stat="defense" />{" "}
            は記事ソースのバイト数です。属性は記事のWikidata分類から決まります。未対応の記事は総合で、相性倍率はありません。
          </p>
          <ul className="my-3 space-y-1">
            {affinityRules.map((r) => (
              <li key={r.from} className="flex flex-wrap items-center gap-1">
                <ElementBadge element={r.from} /> → <ElementBadge element={r.to} />
                ：<StatIcon stat="attack" /> 2倍
              </li>
            ))}
          </ul>
          <p>
            同じ位置のカード同士で、
            <StatIcon stat="attack" /> × 相性倍率 − 相手の <StatIcon stat="defense" />
            （最低0）を比較します。3組の勝ち数で勝敗を決めます。相性はゲーム上のルールで、現実の優劣を示すものではありません。
          </p>
        </details>
      </div>
      {sheet === "team" && (
        <BattleSheet
          title={editing ? "チームを編集" : "チームを編成"}
          onClose={closeSheet}
          busy={save.isPending}
        >
          {save.isError && (
            <p role="alert" className="text-sm text-red-700">
              {save.error.message}
            </p>
          )}
          {discard ? (
            <div className="space-y-4">
              <p>保存していない変更があります。変更を破棄して閉じますか？</p>
              <button className={secondary} onClick={() => setDiscard(false)}>
                編集を続ける
              </button>
              <button
                className={`${action} ml-2`}
                onClick={() => {
                  setDiscard(false);
                  setSheet(null);
                }}
              >
                変更を破棄
              </button>
            </div>
          ) : (
            <>
              <SelectedTeamCards
                cards={selected}
                onRemove={(id) => setMembers((old) => toggleTeamMember(old, id))}
                onSwap={swap}
              />
              <label className="block text-sm font-semibold">
                チーム名
                <input
                  className={`${field} mt-2`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                />
              </label>
              <TeamCardPicker
                cards={cards}
                members={members}
                onToggle={(id) => setMembers((old) => toggleTeamMember(old, id))}
              />
              <div className="sticky bottom-0 -mx-5 border-t border-slate-100 bg-white px-5 py-3">
                <button
                  className={`${action} w-full`}
                  disabled={!ready || !complete || !name.trim() || save.isPending}
                  onClick={() => save.mutate({ slot, name: name.trim(), members })}
                >
                  {save.isPending ? "保存中…" : editing ? "変更を保存" : "チームを作成して参加"}
                </button>
              </div>
            </>
          )}
        </BattleSheet>
      )}
      {sheet === "practice" && (
        <BattleSheet
          title={`${practiceTeam?.name ?? "チーム"}で練習`}
          onClose={() => setSheet(null)}
        >
          <p className="text-sm text-slate-600">
            保存済みのチームで試します。カード・ptの消費やランキングへの反映はありません。
          </p>
          <label className="block text-sm">
            練習相手
            <select
              aria-label="練習相手"
              className={field}
              value={opponentId}
              onChange={(e) => {
                setOpponentId(e.target.value);
                setPractice(false);
              }}
            >
              <option value="">練習用のサンプルチーム</option>
              {opponents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.player} / {t.name}（{latest.data?.date}時点）
                </option>
              ))}
            </select>
          </label>
          <button
            className={action}
            disabled={practiceCards.length !== 3 || practiceCards.some((c) => c.defense === null)}
            onClick={() => setPractice(true)}
          >
            このチームで試す
          </button>
          {practice && practiceCards.length === 3 && (
            <MatchDetail left={fighters(practiceCards)} right={opponent?.members ?? sample} />
          )}
        </BattleSheet>
      )}
      {sheet === "fusion" && (
        <BattleSheet
          title={confirm ? "強化内容を確認" : "カードを強化"}
          onClose={closeSheet}
          busy={fuse.isPending}
        >
          {fuse.isError && (
            <p role="alert" className="text-sm text-red-700">
              {fuse.error.message}
            </p>
          )}
          {result && (
            <p role="status" className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
              {result.materialCount}枚を素材にして強化しました。
              <StatIcon stat="attack" /> +{statNumber(result.attackGain)}{" "}
              <StatIcon stat="defense" /> +{statNumber(result.defenseGain)}
              。次回の対戦から反映されます。
            </p>
          )}
          {base ? (
            <section className="space-y-3">
              <h3 className="font-bold">強化するカード</h3>
              <CardIdentity card={base} />
              {!confirm && (
                <button
                  className={secondary}
                  onClick={() => {
                    setBaseId("");
                    setMaterialIds([]);
                    setResult(null);
                  }}
                >
                  強化するカードを変更
                </button>
              )}
            </section>
          ) : (
            <FusionCardPicker
              label="強化するカードを選ぶ"
              emptyMessage="強化できるカードがありません。能力値を計測済みの所持カードが必要です。"
              cards={cards.filter((c) => c.defense !== null)}
              selected={baseId}
              onSelect={(id) => {
                setBaseId(id);
                setResult(null);
              }}
            />
          )}
          {base && !confirm && (
            <FusionMaterialPicker
              groups={materialGroups}
              selected={materialIds}
              onChange={(ids) => {
                setMaterialIds(ids);
                setResult(null);
                fuse.reset();
              }}
            />
          )}
          {base && confirm && (
            <section className="space-y-4">
              <h3 className="font-bold">消費する素材（合計{materialIds.length}枚）</h3>
              {selectedGroups.map((group) => (
                <div key={group.key} className="border-b border-slate-100 pb-3">
                  <CardIdentity card={group.card} />
                  <p className="mt-2 text-right text-sm font-bold">{group.count}枚を消費</p>
                </div>
              ))}
              <p className="text-sm font-semibold text-red-700">
                選択した{materialIds.length}枚の素材カードはなくなり、元に戻せません。
              </p>
            </section>
          )}
          {base && (
            <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-slate-100 bg-white px-5 py-3">
              {confirm && (
                <button
                  className={secondary}
                  disabled={fuse.isPending}
                  onClick={() => setConfirm(false)}
                >
                  素材を選び直す
                </button>
              )}
              <button
                className={`${action} flex-1`}
                disabled={!canFuse}
                onClick={() => (confirm ? fuse.mutate({ baseId, materialIds }) : setConfirm(true))}
              >
                {fuse.isPending
                  ? "強化中…"
                  : confirm
                    ? `${materialIds.length}枚を消費して強化`
                    : `選択した${materialIds.length}枚を確認`}
              </button>
            </div>
          )}
        </BattleSheet>
      )}
      {removeSlot !== null && (
        <BattleSheet
          title="チームを解除"
          busy={remove.isPending}
          onClose={() => setRemoveSlot(null)}
        >
          {remove.isError && (
            <p role="alert" className="text-sm text-red-700">
              {remove.error.message}
            </p>
          )}
          <p className="text-sm">
            「{savedTeams.find((t) => t.slot === removeSlot)?.name}
            」の次回以降の参加を取り消します。カードや過去の結果は残ります。
          </p>
          <button
            className={secondary}
            disabled={remove.isPending}
            onClick={() => setRemoveSlot(null)}
          >
            やめる
          </button>
          <button
            className={`${action} ml-2`}
            disabled={remove.isPending}
            onClick={() => remove.mutate({ slot: removeSlot })}
          >
            {remove.isPending ? "解除中…" : "解除する"}
          </button>
        </BattleSheet>
      )}
      {detail && (
        <BattleSheet title={`${detail.name}の対戦内訳`} onClose={() => setDetail(null)}>
          <p className="text-sm text-slate-600">
            {ranking.data?.date} 時点のカード・能力値で表示しています。
          </p>
          {ranking.data?.ranking
            .filter((t) => t.userId !== detail.userId)
            .map((t) => (
              <details key={t.id} className="border-t border-slate-200 py-3">
                <summary className="cursor-pointer py-2 text-sm font-bold">
                  {outcome(fight(detail.members, t.members, detail.ruleVersion ?? 1))} · {t.player}{" "}
                  / {t.name}
                </summary>
                <MatchDetail
                  left={detail.members}
                  right={t.members}
                  ruleVersion={detail.ruleVersion ?? 1}
                />
              </details>
            ))}
          {!ranking.data?.ranking.some((t) => t.userId !== detail.userId) && (
            <p>この日は対戦相手がいませんでした。</p>
          )}
        </BattleSheet>
      )}
    </div>
  );
}
