import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import type { Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { useState } from "react";

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

// 画像と説明を分け、アルバムのように正方形のアートワークを並べる。
export function WikiCard({
  card,
  size = "md",
  className,
  ownedCount,
}: {
  card: WikiCardData;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  ownedCount?: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showText = size !== "xs";

  return (
    <div
      className={cn(
        "min-w-0 max-w-full",
        { xs: "w-16 shrink-0", sm: "w-28", md: "w-64", lg: "w-72" }[size],
        className,
      )}
    >
      <div
        data-testid="card-artwork"
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[6%]"
        style={{ backgroundColor: card.genreColorHex }}
      >
        {card.imageUrl && failedImage !== card.imageUrl ? (
          <img
            src={cardImageDisplayUrl(card.imageUrl)}
            alt={showText ? "" : card.title}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            onError={() => setFailedImage(card.imageUrl ?? null)}
          />
        ) : (
          <span
            className={cn(
              "font-semibold text-white",
              { xs: "text-xl", sm: "text-4xl", md: "text-7xl", lg: "text-8xl" }[size],
            )}
            aria-label={showText ? undefined : card.title}
            aria-hidden={showText || undefined}
          >
            {Array.from(card.title)[0]}
          </span>
        )}
        {ownedCount !== undefined && ownedCount > 0 && (
          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-slate-900/75 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
            ×{ownedCount}
          </span>
        )}
      </div>
      {showText && (
        <div className={cn("mt-2 text-left", size === "sm" ? "text-xs" : "text-base")}>
          <p className="line-clamp-2 font-semibold leading-snug text-slate-800" title={card.title}>
            {card.title}
          </p>
          <p className="mt-0.5 truncate text-slate-500" title={card.genreName}>
            {card.genreName}
          </p>
          {(size === "md" || size === "lg") && (
            <div className="mt-2">
              <RarityMarks rarity={card.rarity} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
