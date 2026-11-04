import { cn } from "@wiki-collection/ui/lib/utils";
import { BookOpen } from "lucide-react";
import type { CSSProperties } from "react";

// 箔の反射と上下の圧着線で、未開封の袋を表現する。
export function PackArt({
  name,
  colorHex,
  label,
  className,
}: {
  name: string;
  colorHex: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-testid="pack-art"
      role="img"
      aria-label={label ? `${name}（${label}）` : name}
      className={cn("foil-pack relative aspect-[5/8] w-40", className)}
      style={{ "--pack-color": colorHex } as CSSProperties}
    >
      <div className="foil-pack-body absolute inset-x-[1%] inset-y-[5%] overflow-hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 250 400"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          fill="none"
        >
          <g stroke="#000" strokeOpacity=".55" strokeWidth="3" transform="translate(1 2)">
            <path d="M-40 10 90 140 48 182 -20 114 M85 -30 220 105 187 138 262 213 M165 -30 115 20 220 125 M-30 220 38 152 140 254 98 296 -12 186 M275 210 220 265 162 207 119 250 244 375 M-20 330 52 258 150 356 108 398 M60 -20 15 25 135 145 M240 30 202 68" />
          </g>
          <g stroke="#fff" strokeOpacity=".65" strokeWidth="1.2">
            <path d="M-40 10 90 140 48 182 -20 114 M85 -30 220 105 187 138 262 213 M165 -30 115 20 220 125 M-30 220 38 152 140 254 98 296 -12 186 M275 210 220 265 162 207 119 250 244 375 M-20 330 52 258 150 356 108 398 M60 -20 15 25 135 145 M240 30 202 68" />
          </g>
        </svg>
        <div aria-hidden className="foil-pack-folds absolute inset-0" />
        <div aria-hidden className="pack-shine pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[31%] border-t border-white/25 bg-[#090e14]/90"
        />
        <div className="relative flex h-full flex-col items-center text-center text-white">
          <span className="mt-[10%] text-[4cqw] font-semibold tracking-[0.28em] text-white/90">
            WIKI COLLECTION
          </span>
          <span className="mt-[3%] bg-black/80 px-[5%] py-[1%] text-[2.8cqw] font-semibold tracking-[0.3em]">
            KNOWLEDGE SERIES
          </span>
          <div className="absolute top-[62%] flex aspect-square w-[29%] rotate-45 items-center justify-center rounded-[16%] border border-white/90 bg-gradient-to-br from-slate-200 via-slate-500 to-slate-950 shadow-[0_2px_12px_#0008,inset_0_0_0_3px_#ffffff20]">
            <BookOpen
              aria-hidden="true"
              className="h-[56%] w-[56%] -rotate-45 text-white"
              strokeWidth={1.4}
            />
          </div>
          <span className="absolute inset-x-[5%] bottom-[7%] text-[4cqw] font-semibold tracking-[0.2em]">
            {label ?? "5 CARDS / PACK"}
          </span>
        </div>
      </div>
      <div aria-hidden className="foil-pack-seal absolute inset-x-0 top-0 h-[6%]" />
      <div aria-hidden className="foil-pack-seal absolute inset-x-0 bottom-0 h-[6%]" />
    </div>
  );
}
