import { useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  Swords,
  Atom,
  Building2,
  CircleHelp,
  Droplets,
  Flame,
  Leaf,
  Palette,
  UserRound,
} from "lucide-react";
import {
  affinityRules,
  legacyAffinityRules,
  legacyWeakness,
  type BattleRuleVersion,
  elementLabels,
  weakness,
  type HistoricalElement,
} from "@wiki-collection/db/battle";
import { BattleSheet } from "@/components/battle/battle-sheet";

import { StatIcon } from "@/components/card-stats";

const appearances = {
  person: { Icon: UserRound, color: "bg-amber-100 text-amber-800" },
  culture: { Icon: Palette, color: "bg-violet-100 text-violet-800" },
  society: { Icon: Building2, color: "bg-sky-100 text-sky-800" },
  technology: { Icon: Atom, color: "bg-indigo-100 text-indigo-800" },
  nature: { Icon: Leaf, color: "bg-emerald-100 text-emerald-800" },
  general: { Icon: CircleHelp, color: "bg-slate-100 text-slate-700" },
  fire: { Icon: Flame, color: "bg-orange-100 text-orange-800" },
  water: { Icon: Droplets, color: "bg-blue-100 text-blue-800" },
  grass: { Icon: Leaf, color: "bg-lime-100 text-lime-800" },
} as const;

export function ElementSymbol({
  element,
  compact = false,
}: {
  element: HistoricalElement;
  compact?: boolean;
}) {
  const { Icon, color } = appearances[element];
  return (
    <span
      className={`inline-flex ${compact ? "size-5" : "size-8"} shrink-0 items-center justify-center rounded-full ${color}`}
    >
      <Icon className={compact ? "size-3.5" : "size-[18px]"} aria-hidden="true" />
    </span>
  );
}

type AffinityRule = { from: HistoricalElement; to: HistoricalElement };

export function AffinityDiagram({
  rules,
  selected,
}: {
  rules: readonly AffinityRule[];
  selected?: HistoricalElement;
}) {
  const id = useId();
  const point = (angle: number) => ({
    x: 180 + 118 * Math.cos(angle),
    y: 180 + 118 * Math.sin(angle),
  });
  const step = (Math.PI * 2) / rules.length;
  return (
    <svg
      viewBox="0 0 360 360"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="mx-auto block w-full max-w-[360px]"
    >
      <title id={`${id}-title`}>属性の相性図</title>
      <desc id={`${id}-desc`}>
        {rules
          .map((r) => `${elementLabels[r.from]}から${elementLabels[r.to]}への攻撃力が2倍`)
          .join("。")}
      </desc>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 1 1 L 9 5 L 1 9"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      {rules.map((r, i) => {
        const angle = -Math.PI / 2 + step * i;
        const start = point(angle + 0.39),
          end = point(angle + step - 0.39);
        return (
          <path
            key={r.from}
            d={`M ${start.x} ${start.y} A 118 118 0 0 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={r.from === selected ? "#7c3aed" : "#94a3b8"}
            strokeWidth={r.from === selected ? 3 : 2}
            markerEnd={`url(#${id}-arrow)`}
          />
        );
      })}
      <text x="180" y="170" textAnchor="middle" fill="#64748b" fontSize="12">
        矢印の先に
      </text>
      <Swords
        x="143"
        y="178"
        width="20"
        height="20"
        className="text-orange-600"
        aria-hidden="true"
      />
      <text x="190" y="195" textAnchor="middle" fill="#0f172a" fontSize="20" fontWeight="700">
        2倍
      </text>
      {rules.map((r, i) => {
        const { x, y } = point(-Math.PI / 2 + step * i);
        const { Icon, color } = appearances[r.from];
        return (
          <g key={r.from} className={color}>
            <circle cx={x} cy={y} r="37" fill="white" />
            <circle cx={x} cy={y} r="37" fill="currentColor" fillOpacity="0.09" />
            {r.from === selected && (
              <circle cx={x} cy={y} r="40" fill="none" stroke="currentColor" strokeWidth="2" />
            )}
            <Icon x={x - 14} y={y - 25} width="28" height="28" aria-hidden="true" />
            <text
              x={x}
              y={y + 23}
              textAnchor="middle"
              fill="currentColor"
              fontSize="13"
              fontWeight="700"
            >
              {elementLabels[r.from].replace("旧属性・", "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ElementBadge({
  element,
  ruleVersion = 2,
}: {
  element: HistoricalElement;
  ruleVersion?: BattleRuleVersion;
}) {
  const [open, setOpen] = useState(false);
  const elemental = element === "fire" || element === "water" || element === "grass";
  const historical = elemental || element === "technology" || ruleVersion === 1;
  const rules = elemental
    ? ([
        { from: "fire", to: "grass" },
        { from: "grass", to: "water" },
        { from: "water", to: "fire" },
      ] as const)
    : historical
      ? legacyAffinityRules
      : affinityRules;
  const weakTo = (historical ? legacyWeakness : weakness)[element];
  const strongAgainst = rules.find((r) => r.from === element)?.to;
  return (
    <>
      <button
        type="button"
        aria-label={`${elementLabels[element]}属性の相性を見る`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        <ElementSymbol element={element} compact />
      </button>
      {open &&
        createPortal(
          <BattleSheet
            title={historical ? "旧属性の相性" : "属性の相性"}
            onClose={() => setOpen(false)}
          >
            <p className="text-sm leading-relaxed text-slate-600">
              矢印の先の属性には、
              <StatIcon stat="attack" /> が2倍になります。それ以外の組み合わせは等倍です。
            </p>
            <AffinityDiagram rules={rules} selected={element} />
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <ElementSymbol element={element} />
                {elementLabels[element]}
              </div>
              {strongAgainst && weakTo ? (
                <p className="leading-relaxed">
                  {elementLabels[strongAgainst]}への <StatIcon stat="attack" /> が2倍。
                  <br />
                  {elementLabels[weakTo]}から受ける <StatIcon stat="attack" /> も2倍です。
                </p>
              ) : (
                <p>
                  総合は、どの属性とも相性倍率がなく、
                  <StatIcon stat="attack" /> ・受ける <StatIcon stat="attack" /> とも等倍です。
                </p>
              )}
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              {historical
                ? "過去に保存された対戦のルールです。現在のカードには適用されません。"
                : "総合には有利・不利がありません。"}
              倍率は <StatIcon stat="defense" /> を引く前の <StatIcon stat="attack" />{" "}
              にかかります。相性はゲーム上のルールで、現実の優劣を示すものではありません。
            </p>
          </BattleSheet>,
          document.body,
        )}
    </>
  );
}
