import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { FusionCardOption, type BattleCard } from "./card-picker";

export function SelectedTeamCards({
  cards,
  onRemove,
  onSwap,
}: {
  cards: (BattleCard | undefined)[];
  onRemove: (id: string) => void;
  onSwap: (i: number, j: number) => void;
}) {
  return (
    <section
      aria-label="選択したカード"
      className="sticky top-[69px] z-10 -mx-5 -mt-5 border-b border-slate-100 bg-white px-5 py-3"
    >
      <p role="status" className="mb-2 text-xs font-semibold text-sky-700">
        {cards.filter(Boolean).length} / 3枚 選択中
      </p>
      <ol className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const card = cards[i];
          return (
            <li key={i} className="min-w-0">
              {card ? (
                <>
                  <SelectedCard card={card} position={i + 1} onRemove={() => onRemove(card.id)} />
                  <div className="flex justify-center">
                    <button
                      type="button"
                      aria-label={`${card.title}を左へ移動`}
                      disabled={i === 0}
                      onClick={() => onSwap(i, i - 1)}
                      className="flex h-9 flex-1 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${card.title}を右へ移動`}
                      disabled={i === cards.length - 1}
                      onClick={() => onSwap(i, i + 1)}
                      className="flex h-9 flex-1 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                  {i + 1}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
function SelectedCard({
  card,
  position,
  onRemove,
}: {
  card: BattleCard;
  position: number;
  onRemove: () => void;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <button
      type="button"
      aria-label={`${card.title}を選択から外す`}
      onClick={onRemove}
      className="relative w-full min-w-0 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-sky-600"
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-sky-50 text-xl font-bold text-sky-700">
        {card.imageUrl && failed !== card.imageUrl ? (
          <img
            className="size-full object-cover"
            src={cardImageDisplayUrl(card.imageUrl)}
            alt=""
            onError={() => setFailed(card.imageUrl)}
          />
        ) : (
          Array.from(card.title)[0]
        )}
      </div>
      <span className="absolute left-1 top-1 rounded bg-slate-900/75 px-1.5 text-xs text-white">
        {position}
      </span>
      <span className="absolute right-1 top-1 rounded-full bg-white p-0.5">
        <X size={14} />
      </span>
      <p className="mt-1 truncate text-xs font-semibold" title={card.title}>
        {card.title}
      </p>
    </button>
  );
}
export function TeamCardPicker({
  cards,
  members,
  onToggle,
}: {
  cards: BattleCard[];
  members: string[];
  onToggle: (id: string) => void;
}) {
  const available = cards.filter((c) => c.defense !== null);
  return (
    <section aria-label="チームに入れるカード" className="space-y-3">
      <p className="text-xs text-slate-600">
        {members.length === 3
          ? "3枚選択済み。入れ替えるときは選択したカードを押して外してください。"
          : "カードを押して3枚選んでください。選んだ順に対戦します。"}
      </p>
      <div className="grid grid-cols-3 items-start gap-3" data-testid="team-card-grid">
        {available.map((card) => (
          <FusionCardOption
            key={card.id}
            card={card}
            selected={members.includes(card.id)}
            selectionLabel={`${members.indexOf(card.id) + 1}番目に選択`}
            disabled={members.length === 3 && !members.includes(card.id)}
            onSelect={() => onToggle(card.id)}
          />
        ))}
      </div>
      {available.length < 3 && (
        <p className="text-sm text-slate-500">編成には能力値を計測済みのカードが3枚必要です。</p>
      )}
    </section>
  );
}
