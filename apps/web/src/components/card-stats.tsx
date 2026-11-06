import { elementLabels, weakness, type HistoricalElement } from "@wiki-collection/db/battle";
export const statNumber = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
export function CardStats({
  attack,
  defense,
  element,
}: {
  attack: number;
  defense: number | null;
  element: HistoricalElement;
}) {
  return (
    <div className="space-y-1 text-xs text-slate-600">
      <p className="font-semibold tabular-nums">
        攻撃 {statNumber(attack)} / 防御 {defense === null ? "未計測" : statNumber(defense)}
      </p>
      <p>
        {elementLabels[element]}属性 ·{" "}
        {weakness[element]
          ? `弱点 ${elementLabels[weakness[element]]}（受ける攻撃力2倍）`
          : "弱点なし・相性倍率なし"}
      </p>
    </div>
  );
}
