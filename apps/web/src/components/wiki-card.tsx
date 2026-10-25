import type { Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { type PointerEvent, useRef, useState } from "react";

import { formatPageviews } from "@/lib/format";

import { RarityMarks } from "./rarity-marks";

export type WikiCardData = {
  title: string;
  rarity: Rarity;
  genreName: string;
  genreColorHex: string;
  imageUrl?: string | null;
  summary?: string;
  monthlyPageviews?: number;
};

const holoRarities: Rarity[] = ["rare", "double_rare", "legendary"];

// Wikipedia の記事1つを表すカード。縦横比は一般的なトレーディングカードと同じ 63:88。
// レア以上はホログラムが乗り、interactive のときは指やマウスの位置に合わせて傾く
export function WikiCard({
  card,
  size = "md",
  interactive = false,
  className,
}: {
  card: WikiCardData;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, px: 50, py: 50 });
  const holo = holoRarities.includes(card.rarity);
  const showText = size === "md" || size === "lg";

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    setTilt({ x: (py - 50) / -4, y: (px - 50) / 4, px, py });
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0, px: 50, py: 50 })}
      className={cn(
        "relative aspect-[63/88] select-none [perspective:800px]",
        { xs: "w-16", sm: "w-28", md: "w-64", lg: "w-72" }[size],
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden shadow-xl transition-transform duration-150 ease-out [transform-style:preserve-3d]",
          size === "xs" ? "rounded-md p-0.5" : size === "sm" ? "rounded-lg p-1" : "rounded-2xl p-2",
          card.rarity === "legendary"
            ? "bg-gradient-to-br from-amber-200 via-yellow-50 to-amber-400"
            : card.rarity === "double_rare"
              ? "bg-gradient-to-br from-fuchsia-200 via-sky-100 to-emerald-200"
              : "bg-gradient-to-br from-slate-100 via-white to-slate-300",
        )}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div
          className={cn(
            "flex h-full flex-col overflow-hidden bg-white",
            size === "xs" ? "rounded-sm" : size === "sm" ? "rounded-md" : "rounded-xl",
          )}
          style={{ boxShadow: `inset 0 0 0 ${size === "xs" ? 1 : 2}px ${card.genreColorHex}55` }}
        >
          {showText && (
            <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
              <span className="truncate text-base font-extrabold text-slate-800">{card.title}</span>
              <RarityMarks rarity={card.rarity} />
            </div>
          )}
          <div
            className={cn(
              "relative mx-auto flex w-full items-center justify-center overflow-hidden",
              showText ? "mx-2 aspect-[4/3] w-[calc(100%-1rem)] rounded-lg" : "flex-1",
            )}
            style={{
              background: `radial-gradient(circle at 30% 20%, #ffffffcc, transparent 45%), linear-gradient(135deg, ${card.genreColorHex}, ${card.genreColorHex}88 55%, #ffffff)`,
            }}
          >
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <span
                className={cn(
                  "font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
                  { xs: "text-xl", sm: "text-4xl", md: "text-7xl", lg: "text-8xl" }[size],
                )}
                aria-hidden
              >
                {card.title.slice(0, 1)}
              </span>
            )}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, #fff 0 1px, transparent 1px 14px)",
              }}
            />
            {/* ホログラムは絵柄の部分にだけ乗せる。文字の上に乗せると読みにくくなるため */}
            {holo && (
              <div
                aria-hidden
                className="holo-foil pointer-events-none absolute inset-0 mix-blend-color-dodge"
                style={{
                  backgroundPosition: `${tilt.px}% ${tilt.py}%`,
                  opacity: card.rarity === "rare" ? 0.45 : 0.7,
                }}
              />
            )}
          </div>
          {showText ? (
            <div className="flex flex-1 flex-col justify-between px-3 py-2">
              <p className="line-clamp-4 text-xs leading-relaxed text-slate-600">{card.summary}</p>
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span
                  className="rounded-full px-2 py-0.5 text-white"
                  style={{ background: card.genreColorHex }}
                >
                  {card.genreName}
                </span>
                {card.monthlyPageviews !== undefined && (
                  <span>月間 {formatPageviews(card.monthlyPageviews)} 閲覧</span>
                )}
              </div>
            </div>
          ) : (
            size === "sm" && (
              <div className="truncate px-1 py-0.5 text-center text-[10px] font-bold text-slate-700">
                {card.title}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
