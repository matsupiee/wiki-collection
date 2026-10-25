import type { Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { motion } from "motion/react";

import { rarityRank } from "@/lib/format";

// ◇ の数でレアリティを表す。レジェンドは ☆
export function RarityMarks({
  rarity,
  size = "sm",
  animate = false,
  className,
}: {
  rarity: Rarity;
  size?: "sm" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const marks =
    rarity === "legendary" ? ["☆"] : Array.from({ length: rarityRank[rarity] + 1 }, () => "◇");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-bold",
        rarity === "legendary" ? "text-amber-500" : "text-slate-500",
        size === "lg" ? "gap-2 text-3xl" : "text-xs",
        className,
      )}
      aria-label={`レアリティ ${marks.length}`}
    >
      {marks.map((mark, i) => (
        <motion.span
          key={i}
          initial={animate ? { scale: 0, opacity: 0, y: 8 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            delay: animate ? 0.35 + i * 0.18 : 0,
            type: "spring",
            stiffness: 500,
            damping: 18,
          }}
          className={cn(
            size === "lg" &&
              "flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md ring-1 ring-slate-200",
            size === "lg" && rarity === "legendary" && "bg-amber-50 ring-amber-300",
          )}
        >
          {mark}
        </motion.span>
      ))}
    </span>
  );
}
