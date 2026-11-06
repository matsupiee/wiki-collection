import { type BattleRuleVersion, type HistoricalElement } from "@wiki-collection/db/battle";
import { Shield, Swords } from "lucide-react";

export const statNumber = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
export function StatIcon({
  stat,
  prominent = false,
}: {
  stat: "attack" | "defense";
  prominent?: boolean;
}) {
  const Icon = stat === "attack" ? Swords : Shield;
  return (
    <span className="inline-flex align-middle">
      <Icon
        className={`${stat === "attack" ? "text-orange-600" : "text-sky-600"} shrink-0 ${prominent ? "h-5 w-5" : "h-3.5 w-3.5"}`}
        aria-hidden="true"
      />
      <span className="sr-only">{stat === "attack" ? "攻撃" : "防御"} </span>
    </span>
  );
}
export function CardStats({
  attack,
  defense,
  prominent = false,
  compact = false,
}: {
  attack: number;
  defense: number | null;
  element: HistoricalElement;
  prominent?: boolean;
  compact?: boolean;
  ruleVersion?: BattleRuleVersion;
}) {
  return (
    <div
      className={`max-w-full overflow-x-auto text-slate-600 ${compact ? "text-[clamp(7px,2.1vw,9px)] [&_svg]:size-[1em]" : "text-xs"}`}
    >
      <div
        className={`flex flex-nowrap items-center whitespace-nowrap tabular-nums ${prominent ? "gap-x-6 py-2 text-lg font-bold text-slate-800" : compact ? "gap-x-1" : "gap-x-4 font-bold"}`}
      >
        <span className={`inline-flex shrink-0 items-center ${compact ? "gap-0.5" : "gap-2"}`}>
          <StatIcon stat="attack" prominent={prominent} />
          {statNumber(attack)}
        </span>
        <span className={`inline-flex shrink-0 items-center ${compact ? "gap-0.5" : "gap-2"}`}>
          <StatIcon stat="defense" prominent={prominent} />
          {defense === null ? "未計測" : statNumber(defense)}
        </span>
      </div>
    </div>
  );
}
