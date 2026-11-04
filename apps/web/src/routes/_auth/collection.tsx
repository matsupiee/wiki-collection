import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { rarities, type Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { WikiCard } from "@/components/wiki-card";
import { formatPt, rarityLabels } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/collection")({
  component: CollectionPage,
});

function CollectionPage() {
  return (
    <div>
      <PageHeader title="コレクション" />
      <OwnedCards />
    </div>
  );
}

function OwnedCards() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [rarity, setRarity] = useState<Rarity | undefined>();
  const [confirming, setConfirming] = useState(false);
  const owned = useQuery(trpc.card.listOwned.queryOptions({ rarity }));
  const redeem = useMutation(
    trpc.card.redeemDuplicates.mutationOptions({
      onSuccess: async (result) => {
        setConfirming(false);
        await queryClient.invalidateQueries();
        toast.success(`${result.count}枚を還元して ${formatPt(result.points)} を受け取りました`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!owned.data) return <Loader />;
  const { cards, duplicates } = owned.data;

  return (
    <div className="px-4 pb-6">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {[undefined, ...rarities].map((r) => (
          <button
            key={r ?? "all"}
            type="button"
            onClick={() => setRarity(r)}
            className={cn(
              "rounded-full px-3 py-1 whitespace-nowrap shadow-sm",
              rarity === r ? "bg-slate-800 text-white" : "bg-white text-slate-500",
            )}
          >
            {r ? rarityLabels[r] : "すべて"}
          </button>
        ))}
      </div>
      {cards.length === 0 ? (
        <div className="rounded-3xl bg-white/80 p-8 text-center text-sm text-slate-500">
          まだカードがありません。
          <Link to="/packs" className="mt-2 block font-bold text-sky-600">
            パックを開けよう
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3" data-testid="owned-cards">
          {cards.map((c) => (
            <Link
              key={c.id}
              to="/cards/$cardId"
              params={{ cardId: c.id }}
              className="flex min-w-0 flex-col items-start"
            >
              <WikiCard card={c} size="sm" className="w-full" />
              <span className="mt-1 text-xs font-bold text-slate-600">
                {c.ownedCount > 0 && `×${c.ownedCount}`}
                {c.listedCount > 0 && (
                  <span className="ml-1 text-amber-600">出品中{c.listedCount}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
      {duplicates.count > 0 && (
        <button
          type="button"
          className="mt-6 w-full rounded-full bg-white py-3 text-sm font-extrabold text-violet-600 shadow-sm"
          onClick={() => setConfirming(true)}
        >
          重複をまとめて還元（{duplicates.count}枚・{formatPt(duplicates.points)}）
        </button>
      )}
      <ConfirmDialog
        open={confirming}
        title="重複をまとめて還元します"
        confirmLabel="還元する"
        pending={redeem.isPending}
        onConfirm={() => redeem.mutate()}
        onCancel={() => setConfirming(false)}
      >
        各カードを1枚ずつ残して {duplicates.count} 枚を手放し、{formatPt(duplicates.points)}{" "}
        を受け取ります。
      </ConfirmDialog>
    </div>
  );
}
