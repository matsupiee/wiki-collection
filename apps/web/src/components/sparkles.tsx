import { motion } from "motion/react";
import { useMemo } from "react";

// カードの周りに舞う光の粒
export function Sparkles({ count = 14, color = "#ffffff" }: { count?: number; color?: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 1.5,
        duration: 1.2 + Math.random() * 1.2,
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-10">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], rotate: [0, 90] }}
          transition={{ repeat: Infinity, delay: p.delay, duration: p.duration }}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full" fill={color}>
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
        </motion.span>
      ))}
    </div>
  );
}
