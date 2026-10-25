import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { WikiCard } from "@/components/wiki-card";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/openings/$openingId/result")({
  component: OpeningResultPage,
});

function OpeningResultPage() {
  const { openingId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const opening = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const openAgain = useMutation(
    trpc.pack.open.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        navigate({ to: "/openings/$openingId", params: { openingId: result.openingId } });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // スキップや URL 直打ちで来た場合も、結果を見たことを記録する
  useEffect(() => {
    if (opening.data && !opening.data.opening.revealedAt) reveal.mutate({ openingId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening.data?.opening.id]);

  if (!opening.data) return <Loader />;
  const { cards, pack } = opening.data;
  const rows = [cards.slice(0, 3), cards.slice(3)];

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col px-4 pt-8 pb-6">
      <h1 className="text-center text-xl font-black text-slate-700">開封結果</h1>
      <div className="mx-auto mt-2 h-1 w-full rounded-full bg-gradient-to-r from-sky-300 via-violet-300 to-amber-200" />
      <p className="mt-2 text-center text-xs text-slate-500">{pack.name}</p>

      <div className="mt-6 flex flex-col items-center gap-4" data-testid="result-cards">
        {rows.map((row, r) => (
          <div key={r} className="flex justify-center gap-3">
            {row.map((c, i) => (
              <motion.div
                key={c.userCardId}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: (r * 3 + i) * 0.08, type: "spring" }}
                className="relative"
              >
                {c.isNew && (
                  <span className="absolute -top-2 -left-1 z-10 rounded-full bg-pink-500 px-1.5 text-[10px] font-black text-white shadow">
                    NEW
                  </span>
                )}
                <Link to="/cards/$cardId" params={{ cardId: c.card.id }}>
                  <WikiCard card={c.card} size="sm" />
                </Link>
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <div className="flex gap-3">
          <Button
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 font-extrabold text-white"
            onClick={() => openAgain.mutate({ packId: pack.id })}
            disabled={openAgain.isPending}
          >
            {openAgain.isPending ? "準備中…" : "もう1パック"}
          </Button>
          <Link to="/collection" className="flex-1">
            <Button variant="outline" className="h-12 w-full rounded-full font-extrabold">
              コレクションへ
            </Button>
          </Link>
        </div>
        <Link to="/packs" className="block text-center text-xs font-bold text-slate-500">
          パック選択にもどる
        </Link>
      </div>
    </div>
  );
}
