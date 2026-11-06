import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { affinityRules, elements, elementLabels, fusionGains } from "@wiki-collection/db/battle";
import { Button } from "@wiki-collection/ui/components/button";
import { CardStats, statNumber } from "@/components/card-stats";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/battle")({ component: BattlePage });
const field = "w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm";
function BattlePage() {
  const trpc = useTRPC(),
    client = useQueryClient();
  const inventory = useQuery(trpc.battle.inventory.queryOptions());
  const teams = useQuery(trpc.battle.teams.queryOptions());
  const [tab, setTab] = useState<"teams" | "fusion" | "ranking">("teams");
  const [slot, setSlot] = useState(1),
    [name, setName] = useState("チーム1"),
    [members, setMembers] = useState(["", "", ""]);
  const [baseId, setBaseId] = useState(""),
    [materialId, setMaterialId] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{
    coefficient: number;
    attackGain: number;
    defenseGain: number;
  } | null>(null);
  const [date, setDate] = useState("");
  const ranking = useQuery(trpc.battle.ranking.queryOptions({ date: date || undefined }));
  const onError = (error: { message: string }) => toast.error(error.message);
  const save = useMutation(
    trpc.battle.saveTeam.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries();
        toast.success("チームを保存しました。次の定期対戦から参加します");
      },
      onError,
    }),
  );
  const remove = useMutation(
    trpc.battle.deleteTeam.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries();
        toast.success("チームを解除しました");
      },
      onError,
    }),
  );
  const fuse = useMutation(
    trpc.battle.fuse.mutationOptions({
      onSuccess: async (data) => {
        setConfirm(false);
        setMaterialId("");
        setResult(data);
        await client.invalidateQueries();
      },
      onError: (error) => {
        setConfirm(false);
        onError(error);
      },
    }),
  );
  const cards = inventory.data ?? [];
  const base = cards.find((c) => c.id === baseId),
    material = cards.find((c) => c.id === materialId);
  const low = material ? fusionGains(material.attack, material.defense ?? 0, 0.2) : null;
  const high = material ? fusionGains(material.attack, material.defense ?? 0, 1) : null;
  const chooseSlot = (value: number) => {
    setSlot(value);
    const saved = teams.data?.find((t) => t.slot === value);
    setName(saved?.name ?? `チーム${value}`);
    setMembers(saved ? [saved.member1, saved.member2, saved.member3] : ["", "", ""]);
  };
  const cardLabel = (c: (typeof cards)[number]) =>
    `${c.title} #${c.id.slice(-5)} · ${elementLabels[c.element]} · 攻 ${statNumber(c.attack)} / 防 ${c.defense === null ? "未計測" : statNumber(c.defense)}`;
  return (
    <div className="pb-8">
      <PageHeader />
      <div className="space-y-6 px-4 pt-4">
        <header>
          <p className="text-xs font-semibold tracking-widest text-sky-600">DAILY BATTLE</p>
          <h1 className="mt-1 text-2xl font-black">チームと対戦</h1>
          <p className="mt-2 text-sm text-slate-500">
            3枚で挑む、毎日の自動対戦。日本時間0時に開催。
          </p>
        </header>
        <div className="flex border-b border-slate-200" role="tablist" aria-label="対戦メニュー">
          {(
            [
              ["teams", "チーム"],
              ["fusion", "カード合成"],
              ["ranking", "ランキング"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 border-b-2 py-3 text-sm font-bold ${tab === key ? "border-sky-500 text-sky-700" : "border-transparent text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {(inventory.isError || teams.isError) && (
          <p role="alert" className="text-sm text-red-600">
            読み込めませんでした。
            <button
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
          <div className="space-y-6">
            <div className="space-y-3">
              {teams.data?.map((t) => (
                <article key={t.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold">
                      {t.slot}. {t.name}
                    </h2>
                    <div className="flex gap-3 text-sm">
                      <button className="text-sky-700" onClick={() => chooseSlot(t.slot)}>
                        編集
                      </button>
                      <button
                        disabled={remove.isPending}
                        className="text-slate-500"
                        onClick={() => remove.mutate({ slot: t.slot })}
                      >
                        解除
                      </button>
                    </div>
                  </div>
                  <ol className="mt-3 divide-y divide-slate-100">
                    {[t.member1, t.member2, t.member3].map((id, i) => {
                      const c = cards.find((c) => c.id === id);
                      return (
                        <li key={id} className="py-2">
                          {c ? (
                            <>
                              <Link
                                to="/cards/$cardId"
                                params={{ cardId: c.cardId }}
                                className="text-sm font-semibold"
                              >
                                {i + 1}. {c.title}
                              </Link>
                              <CardStats
                                attack={c.attack}
                                defense={c.defense}
                                element={c.element}
                              />
                            </>
                          ) : (
                            "読み込み中…"
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </article>
              ))}
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ slot, name, members });
              }}
            >
              <h2 className="text-lg font-bold">チームを編成</h2>
              <label className="block text-sm">
                保存先
                <select
                  aria-label="保存先"
                  className={field}
                  value={slot}
                  onChange={(e) => chooseSlot(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      チーム{n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                チーム名
                <input
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={30}
                />
              </label>
              {members.map((selected, i) => (
                <label key={i} className="block text-sm">
                  {i + 1}枚目
                  <select
                    aria-label={`${i + 1}枚目`}
                    className={field}
                    value={selected}
                    required
                    onChange={(e) =>
                      setMembers((old) => old.map((id, j) => (j === i ? e.target.value : id)))
                    }
                  >
                    <option value="">カードを選ぶ</option>
                    {cards.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={
                          c.defense === null || (members.includes(c.id) && selected !== c.id)
                        }
                      >
                        {cardLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Button
                type="submit"
                disabled={
                  save.isPending ||
                  teams.isPending ||
                  inventory.isPending ||
                  members.some((v) => !v)
                }
                className="w-full"
              >
                {save.isPending ? "保存中…" : "チームを保存"}
              </Button>
              <p className="text-xs leading-relaxed text-slate-500">
                最大3チーム。同じ1枚を複数チームに使えます。編成中のカードは出品・還元・合成素材にできません。解除すると再び使えます。
              </p>
              {cards.length < 3 && !inventory.isPending && (
                <Link to="/packs" className="block text-sm text-sky-700">
                  パックを開けてカードを3枚集める →
                </Link>
              )}
            </form>
          </div>
        )}
        {tab === "fusion" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">お気に入りの1枚を強くする</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              素材の攻撃・防御それぞれの1%に、ランダム係数0.2〜1を掛けて加算します。小数も蓄積されます。ptは消費しません。
            </p>
            <label className="block text-sm">
              強化するカード
              <select
                className={field}
                aria-label="強化するカード"
                value={baseId}
                onChange={(e) => {
                  setBaseId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">ベースを選ぶ</option>
                {cards.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={c.id === materialId || c.defense === null}
                  >
                    {cardLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            {base && (
              <CardStats attack={base.attack} defense={base.defense} element={base.element} />
            )}
            <label className="block text-sm">
              素材にするカード
              <select
                className={field}
                aria-label="素材にするカード"
                value={materialId}
                onChange={(e) => {
                  setMaterialId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">素材を選ぶ（この1枚はなくなります）</option>
                {cards
                  .filter((c) => !c.inTeam)
                  .map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.id === baseId || c.defense === null}
                    >
                      {cardLabel(c)}
                    </option>
                  ))}
              </select>
            </label>
            {low && high && (
              <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
                強化幅の目安
                <br />
                攻撃 +{statNumber(low.attackGain)}〜{statNumber(high.attackGain)}
                <br />
                防御 +{statNumber(low.defenseGain)}〜{statNumber(high.defenseGain)}
              </p>
            )}
            <p className="text-xs text-slate-500">
              素材カードは消費され、元に戻せません。属性とレアリティは変わりません。
            </p>
            <Button
              className="w-full"
              disabled={
                !base ||
                !material ||
                baseId === materialId ||
                material.inTeam ||
                material.defense === null ||
                base.defense === null ||
                fuse.isPending
              }
              onClick={() => setConfirm(true)}
            >
              合成内容を確認
            </Button>
            {result && (
              <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                合成が完了しました！ 係数 {result.coefficient.toFixed(3)}
                <br />
                攻撃 +{statNumber(result.attackGain)} / 防御 +{statNumber(result.defenseGain)}
              </div>
            )}
          </div>
        )}
        {tab === "ranking" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">日次ランキング</h2>
            {ranking.data?.ranking.some((team) =>
              team.members.some(
                (member) => !elements.some((element) => element === member.element),
              ),
            ) && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                この日は旧属性ルールの対戦結果です。新しい対戦から記事分類に基づく属性が使われます。
              </p>
            )}
            <label className="block text-sm">
              対戦日（日本時間）
              <input
                className={field}
                type="date"
                aria-label="対戦日"
                value={date || ranking.data?.date || ""}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <p className="text-xs leading-relaxed text-slate-500">
              別のプレイヤーの全チームと対戦。勝ち3点・引き分け1点。対戦数に対する勝点率で順位を決め、同率は同順位です。対戦報酬はありません。
            </p>
            {ranking.isPending ? (
              <p>集計結果を読み込み中…</p>
            ) : ranking.isError ? (
              <p role="alert">ランキングを読み込めませんでした。</p>
            ) : !ranking.data || !ranking.data.ranking.length ? (
              <p className="py-6 text-center text-sm text-slate-500">
                まだ対戦結果がありません。チームを作って次の開催を待ちましょう。
              </p>
            ) : (
              <ol className="divide-y divide-slate-200">
                {ranking.data.ranking.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl font-black text-sky-700">{r.rank}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-bold">{r.name}</h3>
                        <p className="text-xs text-slate-500">{r.player}</p>
                        <p className="mt-1 text-sm">
                          {r.wins}勝 {r.losses}敗 {r.draws}分 · {r.points}点
                        </p>
                        <details className="mt-2 text-xs text-slate-500">
                          <summary className="cursor-pointer">対戦時のカード</summary>
                          {r.members.map((m, i) => (
                            <div key={m.id} className="mt-2">
                              <p>
                                {i + 1}. {m.title}
                              </p>
                              <CardStats
                                attack={m.attack}
                                defense={m.defense}
                                element={m.element}
                              />
                            </div>
                          ))}
                        </details>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <details className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          <summary className="cursor-pointer font-semibold">能力値と対戦ルール</summary>
          <p className="mt-2">
            基本攻撃力は取り込み時の月間閲覧数、基本防御力は記事ソースのバイト数です。属性は記事のWikidata分類から「人物・自然・科学技術・社会・文化」に分けます。分類未対応の記事は「総合」で、相性倍率はありません。弱点を突く攻撃力は2倍になります。
          </p>
          <ul className="mt-2 space-y-1">
            {affinityRules.map((rule) => (
              <li key={rule.from}>
                {elementLabels[rule.from]} → {elementLabels[rule.to]}：{rule.reason}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            相性は百科事典の分野をつなぐゲーム上のルールです。現実の優劣を示すものではありません。
          </p>
          <p className="mt-2">
            同じ位置のカード同士が同時に攻撃し、「攻撃力 −
            相手の防御力」（最低0）が大きい側の勝ち。同値は引き分けです。3組の勝ち数でチームの勝敗を決めます。保存・強化の変更は次の定期対戦に反映されます。未計測の記事は能力値の補完後に編成・合成できます。
          </p>
        </details>
      </div>
      <ConfirmDialog
        open={confirm}
        title="素材を消費して合成します"
        confirmLabel="合成する"
        pending={fuse.isPending}
        onConfirm={() => fuse.mutate({ baseId, materialId })}
        onCancel={() => setConfirm(false)}
      >
        「{material?.title}」を1枚消費して「{base?.title}」を強化します。素材は元に戻せません。
      </ConfirmDialog>
    </div>
  );
}
