import { ElementBadge } from "@/components/element-badge";
import {
  duelDetails,
  fight,
  type BattleRuleVersion,
  type Fighter,
} from "@wiki-collection/db/battle";
import { StatIcon, statNumber } from "@/components/card-stats";
export const outcome = (result: number) => (result > 0 ? "勝ち" : result < 0 ? "負け" : "引き分け");
export function MatchDetail({
  left,
  right,
  ruleVersion = 2,
  leftLabel = "自分",
}: {
  left: Fighter[];
  right: Fighter[];
  ruleVersion?: BattleRuleVersion;
  leftLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="font-bold text-sky-800">
        チームの結果：{outcome(fight(left, right, ruleVersion))}
      </p>
      {left.map((a, i) => {
        const b = right[i]!;
        const detail = duelDetails(a, b, ruleVersion);
        return (
          <div key={`${a.id}-${i}`} className="border-t border-slate-200 pt-3 text-xs">
            <p className="mb-2 font-bold">
              {i + 1}番手：{outcome(detail.result)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { c: a, h: detail.left, defense: b.defense },
                { c: b, h: detail.right, defense: a.defense },
              ].map(({ c, h, defense }, side) => {
                return (
                  <div key={side} className="min-w-0 break-words">
                    <p className="text-slate-500">{side === 0 ? leftLabel : "相手"}</p>
                    <div className="mt-1 flex items-center gap-1 font-bold">
                      <ElementBadge element={c.element} ruleVersion={ruleVersion} />
                      <p className="min-w-0">{c.title}</p>
                    </div>
                    <p className="mt-2">
                      <StatIcon stat="attack" /> {statNumber(c.attack)} × {h.multiplier}
                      {h.multiplier === 2 ? "（弱点）" : ""}
                    </p>
                    <p>
                      − 相手の <StatIcon stat="defense" /> {statNumber(defense)}
                    </p>
                    <p className="mt-1 font-bold text-sky-800">ダメージ {statNumber(h.damage)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        同じ位置のダメージを比較します。最低ダメージは0、同値は引き分け。3組の勝ち数でチームの勝敗が決まります。
      </p>
    </div>
  );
}
