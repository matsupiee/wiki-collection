import { MAX_FUSION_MATERIALS } from "@wiki-collection/db/battle";
import { FusionCardOption, secondary } from "./card-picker";
import type { MaterialGroup } from "./fusion-materials";
export function FusionMaterialPicker({
  groups,
  selected,
  onChange,
}: {
  groups: MaterialGroup[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const setCount = (group: MaterialGroup, count: number) => {
    const others = selected.filter((id) => !group.available.some((c) => c.id === id));
    const safeCount = Math.min(
      Math.max(0, count),
      group.available.length,
      MAX_FUSION_MATERIALS - others.length,
    );
    onChange([...others, ...group.available.slice(0, safeCount).map((c) => c.id)]);
  };
  return (
    <section aria-label="素材にするカードを選ぶ" className="space-y-4">
      <h3 className="font-bold">素材にするカードを選ぶ</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={secondary}
          disabled={!groups.some((g) => !g.strengthened)}
          onClick={() =>
            onChange(
              groups
                .filter((g) => !g.strengthened)
                .flatMap((g) => g.available.map((c) => c.id))
                .slice(0, MAX_FUSION_MATERIALS),
            )
          }
        >
          未強化をまとめて選択
        </button>
        <button
          type="button"
          className={secondary}
          disabled={!selected.length}
          onClick={() => onChange([])}
        >
          選択を解除
        </button>
      </div>
      <p role="status" className="text-sm font-semibold text-sky-800">
        {selected.length}枚 選択中{" "}
        <span className="font-normal text-slate-500">/ 一度に{MAX_FUSION_MATERIALS}枚まで</span>
      </p>
      {!groups.length && (
        <p className="py-4 text-sm text-slate-600">
          素材にできるカードがありません。編成中のカードを使う場合は、チームから外してください。
        </p>
      )}
      <div className="grid grid-cols-3 items-start gap-x-3 gap-y-5" data-testid="fusion-materials">
        {groups.map((group) => {
          const count = group.available.filter((c) => selected.includes(c.id)).length;
          return (
            <div
              key={group.key}
              role="group"
              aria-label={`${group.card.title}${group.strengthened ? "（強化済み）" : ""}`}
              className="min-w-0"
            >
              <FusionCardOption
                card={group.card}
                selected={count > 0}
                onSelect={() => setCount(group, count ? 0 : 1)}
              />
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                所持{group.ownedCount}枚<br />
                素材に使える{group.available.length}枚
              </p>
              <div className="mt-2 flex items-center rounded-lg border border-slate-200">
                <button
                  type="button"
                  aria-label={`${group.card.title}の素材を1枚減らす`}
                  disabled={!count}
                  className="min-h-11 min-w-0 flex-1 font-bold disabled:opacity-30"
                  onClick={() => setCount(group, count - 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`${group.card.title}の素材枚数`}
                  min={0}
                  max={Math.min(
                    group.available.length,
                    MAX_FUSION_MATERIALS - selected.length + count,
                  )}
                  value={count}
                  onChange={(e) => setCount(group, Math.floor(Number(e.target.value) || 0))}
                  className="min-h-11 w-9 min-w-0 appearance-none bg-transparent text-center text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label={`${group.card.title}の素材を1枚増やす`}
                  disabled={
                    count >= group.available.length || selected.length >= MAX_FUSION_MATERIALS
                  }
                  className="min-h-11 min-w-0 flex-1 font-bold disabled:opacity-30"
                  onClick={() => setCount(group, count + 1)}
                >
                  ＋
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
