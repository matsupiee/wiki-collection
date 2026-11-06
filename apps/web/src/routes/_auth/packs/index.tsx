import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { PackArt } from "@/components/pack-art";
import { PageHeader } from "@/components/page-header";
import { formatClock, formatPt, rarityLabels } from "@/lib/format";
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

  const queryClient = useQueryClient();
  const opening = useRef(false);
  const swiped = useRef(false);
  const currentPack = packs.data?.packs[index];
  const detail = useQuery(
    trpc.pack.get.queryOptions({ slug: currentPack?.slug ?? "" }, { enabled: !!currentPack }),
  );
  const open = useMutation(
    trpc.pack.open.mutationOptions({
      onSuccess: ({ openingId }) => {
        void queryClient.invalidateQueries();
        void navigate({ to: "/openings/$openingId", params: { openingId } });
      },
      onError: (error) => {
        opening.current = false;
        toast.error(error.message);
        void queryClient.invalidateQueries();
      },
    }),
  );

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
        <div
          className="relative mt-2 h-[22rem] w-full touch-pan-y overflow-x-clip"
          onPointerDown={(e) => {
            dragStart.current = e.clientX;
            swiped.current = false;
          }}
          onPointerCancel={() => {
            dragStart.current = null;
          }}
          onPointerUp={(e) => {
            if (dragStart.current === null) return;
            const dx = e.clientX - dragStart.current;
            dragStart.current = null;
            if (Math.abs(dx) > 40) {
              swiped.current = true;
              move(dx < 0 ? 1 : -1);
            }
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
                disabled={
                  open.isPending || (offset === 0 && (!detail.data || !detail.data.canOpen))
                }
                onClick={() => {
                  if (swiped.current || opening.current) return;
                  if (offset !== 0) {
                    setIndex(i);
                    return;
                  }
                  opening.current = true;
                  open.mutate({ packId: p.id });
                }}
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
                    className="pointer-events-none absolute top-full left-1/2 mt-1 h-16 w-44 -translate-x-1/2 overflow-hidden scale-y-[-1] opacity-25 blur-[1px] [mask-image:linear-gradient(to_bottom,transparent,black)]"
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

        {detail.data && (
          <div className="my-4 w-full space-y-3 text-center text-xs text-slate-600">
            <p aria-live="polite">
              {open.isPending
                ? "準備中…"
                : current?.type === "free_basic"
                  ? "パックをタップして開封"
                  : `タップで ${formatPt(current?.priceCoins ?? 0)} を使って開封（残高 ${formatPt(detail.data.balance)}）`}
            </p>
            {detail.data.blockedReason === "insufficient_coins" && (
              <Link to="/point" className="font-bold text-sky-600">
                pt が不足しています。pt を購入する
              </Link>
            )}
            <details key={current?.id} className="rounded-2xl bg-white/80 p-3 text-left">
              <summary className="cursor-pointer font-bold">排出率・出やすいカードを見る</summary>
              {detail.data.featuredCards.length > 0 && (
                <p className="mt-2">
                  出やすいカード: {detail.data.featuredCards.map((card) => card.title).join("、")}
                </p>
              )}
              <table className="mt-2 w-full" data-testid="slot-rates">
                <tbody>
                  {detail.data.slotRates.map((slot) => (
                    <tr key={slot.slot} className="border-t border-slate-100">
                      <th className="py-2 pr-2 whitespace-nowrap">{slot.slot}枚目</th>
                      <td>
                        {slot.rates
                          .map((rate) => `${rarityLabels[rate.rarity]} ${rate.percent}%`)
                          .join(" / ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
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
                今日の分 {freePack.dailyRemaining}/{freePack.dailyLimit}
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
