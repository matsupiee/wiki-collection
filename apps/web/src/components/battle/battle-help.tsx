import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { affinityRules, elementLabels } from "@wiki-collection/db/battle";
import { StatIcon } from "@/components/card-stats";
import { BattleSheet } from "./battle-sheet";

export function BattleHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="対戦のルールと遊び方"
        aria-haspopup="dialog"
        title="対戦のルールと遊び方"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-40 flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <CircleHelp size={22} aria-hidden="true" />
      </button>
      {open && (
        <BattleSheet title="対戦のルールと遊び方" onClose={() => setOpen(false)}>
          <div className="space-y-6 text-sm leading-relaxed text-slate-600 [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-slate-900">
            <section>
              <h3>1. 3枚でチームを作ろう</h3>
              <p>
                「チームを編成」から所持カードを3枚選び、名前と並び順を決めて保存します。
                最大3チームまで作れ、同じ所持カードを別のチームにも使えます。
                能力値が未計測のカードは編成できません。
              </p>
            </section>
            <section>
              <h3>2. 同じ番手どうしで勝負</h3>
              <p>1番手・2番手・3番手がそれぞれ同時に攻撃し、与えるダメージを比べます。</p>
              <p className="my-2 rounded-xl bg-slate-50 px-3 py-3 text-slate-900">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <StatIcon stat="attack" /> × 相性倍率 − 相手の <StatIcon stat="defense" />
                </span>
                <span className="mt-1 block text-xs text-slate-500">ダメージの最低値は0です。</span>
              </p>
              <p>
                ダメージが大きいカードの勝ち。同じなら引き分けです。
                3組のうち勝った数が多いチームが勝利し、勝った数が同じならチームも引き分けになります。
              </p>
            </section>
            <section>
              <h3>3. 属性の相性を活かそう</h3>
              <p>
                次の矢印の方向に弱点を突くと、
                <StatIcon stat="attack" /> が2倍になります。
              </p>
              <ul className="my-2 grid grid-cols-2 gap-2 rounded-xl bg-sky-50 p-3 text-sky-800">
                {affinityRules.map(({ from, to }) => (
                  <li key={from}>
                    {elementLabels[from]} → {elementLabels[to]}
                  </li>
                ))}
              </ul>
              <p>
                それ以外は1倍で、総合は有利・不利がありません。カードの属性アイコンから相性図も確認できます。
                相性はゲームのルールで、現実の優劣を意味しません。
              </p>
            </section>
            <section>
              <h3>4. まずは練習対戦</h3>
              <p>
                保存したチームの「練習対戦」で、サンプルや最新結果の他プレイヤーのチームを相手に試せます。
                カード・ptの消費や報酬はなく、ランキングにも影響しません。
                結果の内訳を見て、カードや並び順を工夫しましょう。
              </p>
            </section>
            <section>
              <h3>5. 毎日の自動対戦とランキング</h3>
              <p>
                保存したチームは毎日日本時間0時に、他プレイヤーの全チームと自動で対戦します。
                自分のチームどうしは対戦しません。
              </p>
              <p className="mt-2">
                勝ち3点・引き分け1点・負け0点。勝点率（勝点 ÷ 対戦数 ÷
                3）で順位が決まり、同率は同順位です。
                対戦報酬はありません。「ランキング」の行を押すと、その日のカードと対戦の内訳を確認できます。
              </p>
            </section>
            <section>
              <h3>もっと強くしたいときは</h3>
              <p>
                カード右側の強化ボタンや「所持カードを強化」から、素材カードを使って能力値を上げられます。
                ptは消費しませんが、素材にしたカードはなくなり、元に戻せません。
                編成中のカードは還元・出品・素材への利用ができません。
              </p>
            </section>
          </div>
        </BattleSheet>
      )}
    </>
  );
}
