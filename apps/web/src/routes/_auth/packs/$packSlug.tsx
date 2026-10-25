import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PackArt } from "@/components/pack-art";
import { PageHeader } from "@/components/page-header";
import { RarityMarks } from "@/components/rarity-marks";
import { formatClock, formatPt, rarityLabels } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/packs/$packSlug")({
  component: PackDetailPage,
});

function PackDetailPage() {
  const { packSlug } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const detail = useQuery(trpc.pack.get.queryOptions({ slug: packSlug }));
  const open = useMutation(
    trpc.pack.open.mutationOptions({
      onSuccess: async ({ openingId }) => {
        await queryClient.invalidateQueries();
        navigate({ to: "/openings/$openingId", params: { openingId } });
      },
      onError: (error) => {
        setConfirming(false);
        toast.error(error.message);
      },
    }),
  );

  if (!detail.data) return <Loader />;
  const { pack, slotRates, featuredCards, blockedReason, freePack, balance } = detail.data;
  const isFree = pack.type === "free_basic";

  const onOpen = () => {
    if (isFree) open.mutate({ packId: pack.id });
    else setConfirming(true);
  };

  return (
    <div>
      <PageHeader back="/packs" />
      <div className="flex flex-col items-center px-6 pb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
          transition={{ scale: { type: "spring" }, y: { repeat: Infinity, duration: 3 } }}
          className="mt-4"
        >
          <PackArt name={pack.name} colorHex={pack.colorHex} className="w-52" />
        </motion.div>

        <div className="mt-6 w-full space-y-2 text-center">
          {blockedReason === null ? (
            <Button
              className="h-12 w-56 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 text-base font-extrabold text-white shadow-lg shadow-sky-200"
              onClick={onOpen}
              disabled={open.isPending}
            >
              {open.isPending
                ? "準備中…"
                : isFree
                  ? "これにする（無料）"
                  : `これにする ${formatPt(pack.priceCoins ?? 0)}`}
            </Button>
          ) : blockedReason === "no_free_pack" ? (
            <Button className="h-12 w-56 rounded-full text-base font-extrabold" disabled>
              あと {formatClock(new Date(freePack.dailyResetsAt).getTime() - now)}
            </Button>
          ) : (
            <Link to="/shop">
              <Button className="h-12 w-56 rounded-full bg-amber-400 text-base font-extrabold text-white hover:bg-amber-500">
                pt を購入する
              </Button>
            </Link>
          )}
          <p className="text-xs text-slate-500">
            {isFree ? `無料パック 残り ${freePack.remaining}` : `残高 ${formatPt(balance)}`}
          </p>
        </div>

        <section className="mt-8 w-full">
          <p className="mb-1 text-center text-sm text-slate-600">{pack.description}</p>
          {featuredCards.length > 0 && (
            <>
              <h2 className="mt-4 mb-2 text-sm font-extrabold text-slate-700">出やすいカード</h2>
              <div className="flex flex-wrap gap-2">
                {featuredCards.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm"
                  >
                    {c.title} <RarityMarks rarity={c.rarity} />
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-6 w-full rounded-3xl bg-white/80 p-4 shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-extrabold text-slate-700"
            onClick={() => setShowRates((v) => !v)}
            aria-expanded={showRates}
          >
            排出率を見る <span>{showRates ? "▲" : "▼"}</span>
          </button>
          {showRates && (
            <table className="mt-3 w-full text-xs" data-testid="slot-rates">
              <tbody>
                {slotRates.map((slot) => (
                  <tr key={slot.slot} className="border-t border-slate-100 align-top">
                    <th className="py-2 pr-2 text-left font-bold whitespace-nowrap text-slate-500">
                      {slot.slot}枚目
                    </th>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {slot.rates.map((r) => (
                          <span key={r.rarity} className="whitespace-nowrap">
                            {rarityLabels[r.rarity]} <span className="font-bold">{r.percent}%</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`${pack.name}を開封します`}
        confirmLabel="開封する"
        pending={open.isPending}
        onConfirm={() => open.mutate({ packId: pack.id })}
        onCancel={() => setConfirming(false)}
      >
        {formatPt(pack.priceCoins ?? 0)} を使います。
        <br />
        開封後の残高 {formatPt(balance - (pack.priceCoins ?? 0))}
      </ConfirmDialog>
    </div>
  );
}
