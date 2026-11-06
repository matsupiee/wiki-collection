import { ElementBadge } from "@/components/element-badge";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { type Element } from "@wiki-collection/db/battle";
import { CardStats, statNumber } from "@/components/card-stats";

export type BattleCard = {
  id: string;
  cardId: string;
  title: string;
  imageUrl: string | null;
  attack: number;
  defense: number | null;
  element: Element;
  attackBonus: number;
  defenseBonus: number;
  inTeam: boolean;
};
function cardSelectionLabel(card: BattleCard) {
  const strengthened = card.attackBonus > 0 || card.defenseBonus > 0;
  return `${card.title}、攻撃 ${statNumber(card.attack)}、防御 ${card.defense === null ? "未計測" : statNumber(card.defense)}${strengthened ? "、強化済み" : ""}を選ぶ`;
}

export const field =
  "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
export const action =
  "min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-40";
export const secondary =
  "min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40";
export function CardIdentity({
  card,
  linkToDetail = false,
}: {
  card: BattleCard;
  linkToDetail?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-50 text-xl font-bold text-sky-700">
      {card.imageUrl && failedUrl !== card.imageUrl ? (
        <img
          src={cardImageDisplayUrl(card.imageUrl)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedUrl(card.imageUrl)}
        />
      ) : (
        card.title.slice(0, 1)
      )}
    </div>
  );
  return (
    <div className="flex min-w-0 gap-3 text-left">
      {linkToDetail ? (
        <Link
          to="/cards/$cardId"
          params={{ cardId: card.cardId }}
          aria-label={`${card.title}の詳細を見る`}
          className="self-start shrink-0 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          {image}
        </Link>
      ) : (
        image
      )}
      <div className="min-w-0 flex-1 break-words">
        <div className="flex items-center gap-1 text-sm font-bold">
          <ElementBadge element={card.element} />
          <p className="min-w-0">
            {linkToDetail ? (
              <Link
                to="/cards/$cardId"
                params={{ cardId: card.cardId }}
                className="rounded-sm hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                {card.title}
              </Link>
            ) : (
              card.title
            )}
          </p>
        </div>
        <CardStats attack={card.attack} defense={card.defense} element={card.element} />
        {(card.attackBonus > 0 || card.defenseBonus > 0) && (
          <p className="mt-1 text-xs text-sky-700">
            強化済み：攻 +{statNumber(card.attackBonus)} / 防 +{statNumber(card.defenseBonus)}
          </p>
        )}
      </div>
    </div>
  );
}
// 合成では使える個体だけを、コレクションと同じ3列で選ぶ。
export function FusionCardPicker({
  cards,
  selected,
  onSelect,
  label,
  emptyMessage,
}: {
  cards: BattleCard[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
  emptyMessage: string;
}) {
  return (
    <section aria-label={label} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">{label}</h3>
        <span className="shrink-0 text-xs text-slate-500">{cards.length}枚</span>
      </div>
      {cards.length ? (
        <div className="grid grid-cols-3 items-start gap-3" data-testid="fusion-cards">
          {cards.map((card) => (
            <FusionCardOption
              key={card.id}
              card={card}
              selected={selected === card.id}
              onSelect={() => onSelect(card.id)}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-sm leading-relaxed text-slate-600">{emptyMessage}</p>
      )}
    </section>
  );
}
export function FusionCardOption({
  card,
  selected,
  onSelect,
  disabled = false,
  selectionLabel = "選択中",
}: {
  card: BattleCard;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  selectionLabel?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <button
      type="button"
      aria-label={cardSelectionLabel(card)}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className="w-full min-w-0 rounded-lg text-left disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
    >
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-sky-50 text-3xl font-bold text-sky-700 ${selected ? "ring-2 ring-sky-600 ring-offset-2" : ""}`}
      >
        {card.imageUrl && failedUrl !== card.imageUrl ? (
          <img
            src={cardImageDisplayUrl(card.imageUrl)}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            onError={() => setFailedUrl(card.imageUrl)}
          />
        ) : (
          Array.from(card.title)[0]
        )}
        {selected && (
          <span className="absolute inset-x-0 bottom-0 bg-sky-700 py-1 text-center text-[10px] font-bold text-white">
            {selectionLabel}
          </span>
        )}
      </div>
      <p
        className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-slate-800"
        title={card.title}
      >
        {card.title}
      </p>
      <p className="text-[10px] leading-relaxed text-slate-600">
        攻 {statNumber(card.attack)}
        <br />防 {statNumber(card.defense ?? 0)}
      </p>
      {(card.attackBonus > 0 || card.defenseBonus > 0) && (
        <p className="text-[10px] text-sky-700">強化済み</p>
      )}
    </button>
  );
}
