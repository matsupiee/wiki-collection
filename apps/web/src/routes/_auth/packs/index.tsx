import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef, useState } from "react";

import Loader from "@/components/loader";
import { PackArt } from "@/components/pack-art";
import { PageHeader } from "@/components/page-header";
import { formatClock, formatPt } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/packs/")({
  component: PackSelectPage,
});

function PackSelectPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const packs = useQuery(trpc.pack.list.queryOptions());
  const [index, setIndex] = useState(0);
  const dragStart = useRef<number | null>(null);
  const now = useNow();

  if (!packs.data) return <Loader />;
  const list = packs.data.packs;
  const { freePack } = packs.data;
  const current = list[index];

  const move = (delta: number) =>
    setIndex((i) => Math.min(Math.max(i + delta, 0), list.length - 1));

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      <PageHeader />
      <div className="flex flex-1 flex-col items-center px-4 pt-4">
        <div className="rounded-full bg-white/90 px-6 py-2 text-sm font-bold text-slate-600 shadow-md ring-2 ring-white">
          好きなパックを選んでください
        </div>

        <div
          className="relative mt-6 h-[22rem] w-full touch-pan-y"
          onPointerDown={(e) => (dragStart.current = e.clientX)}
          onPointerUp={(e) => {
            if (dragStart.current === null) return;
            const dx = e.clientX - dragStart.current;
            dragStart.current = null;
            if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
          }}
        >
          {list.map((p, i) => {
            const offset = i - index;
            if (Math.abs(offset) > 1) return null;
            return (
              <motion.button
                key={p.id}
                type="button"
                aria-label={offset === 0 ? `${p.name}を選ぶ` : p.name}
                className="absolute top-0 left-1/2"
                initial={false}
                animate={{
                  x: `calc(-50% + ${offset * 150}px)`,
                  scale: offset === 0 ? 1 : 0.68,
                  y: offset === 0 ? [0, -8, 0] : 40,
                  opacity: offset === 0 ? 1 : 0.7,
                  zIndex: offset === 0 ? 10 : 1,
                }}
                transition={{
                  default: { type: "spring", stiffness: 260, damping: 26 },
                  y:
                    offset === 0
                      ? { repeat: Infinity, duration: 3, ease: "easeInOut" }
                      : { duration: 0.3 },
                }}
                onClick={() =>
                  offset === 0
                    ? navigate({ to: "/packs/$packSlug", params: { packSlug: p.slug } })
                    : setIndex(i)
                }
              >
                <PackArt
                  name={p.name}
                  colorHex={p.colorHex}
                  label={p.type === "free_basic" ? "無料" : formatPt(p.priceCoins ?? 0)}
                  className="w-48"
                />
                {offset === 0 && (
                  <div
                    aria-hidden
                    className="mx-auto mt-1 h-16 w-44 scale-y-[-1] opacity-25 blur-[1px] [mask-image:linear-gradient(to_bottom,transparent,black)]"
                  >
                    <PackArt name={p.name} colorHex={p.colorHex} className="w-44" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-1.5">
          {list.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${p.name}へ`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-sky-500" : "w-2 bg-slate-300"}`}
            />
          ))}
        </div>

        {current && (
          <p className="mt-4 text-center text-sm text-slate-600">
            <span className="font-extrabold text-slate-800">{current.name}</span>
            <br />
            {current.description}
          </p>
        )}

        <div
          className="mt-auto mb-6 w-full rounded-3xl bg-white/80 p-4 text-center shadow-sm"
          data-testid="free-pack-status"
        >
          {freePack.remaining > 0 ? (
            <p className="text-sm font-bold text-slate-700">
              無料パック 残り{" "}
              <span className="text-2xl font-black text-violet-600">{freePack.remaining}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                今日の分 {freePack.dailyRemaining}/{freePack.dailyLimit}・登録特典{" "}
                {freePack.initialRemaining}
              </span>
            </p>
          ) : (
            <p className="text-sm font-bold text-slate-700">
              次の無料パックまで
              <span className="ml-2 font-mono text-xl font-black text-violet-600">
                {formatClock(new Date(freePack.dailyResetsAt).getTime() - now)}
              </span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                毎日 0 時に 10 パック開けられるようになります
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
