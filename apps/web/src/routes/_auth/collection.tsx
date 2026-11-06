import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { rarities, type Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { CardStats } from "@/components/card-stats";
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
  const [sort, setSort] = useState<"acquired" | "attack" | "defense">("acquired");
  const [confirming, setConfirming] = useState(false);
  const owned = useQuery({
    ...trpc.card.listOwned.queryOptions({ rarity, sort }),
    placeholderData: keepPreviousData,
  });
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
      <div className="mb-3 flex items-center gap-2 text-xs font-bold">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[undefined, ...rarities].map((r) => (
            <button
              key={r ?? "all"}
              type="button"
              onClick={() => setRarity(r)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 whitespace-nowrap shadow-sm",
                rarity === r ? "bg-slate-800 text-white" : "bg-white text-slate-500",
              )}
            >
              {r ? rarityLabels[r] : "すべて"}
            </button>
          ))}
        </div>
        <select
          aria-label="並び順"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-sm focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          <option value="acquired">引いた順</option>
          <option value="attack">攻撃力順</option>
          <option value="defense">防御力順</option>
        </select>
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
            <div key={c.id} className="flex min-w-0 flex-col items-start">
              <WikiCard
                card={c}
                size="sm"
                className="w-full"
                ownedCount={c.ownedCount}
                renderLink={(children) => (
                  <Link
                    to="/cards/$cardId"
                    params={{ cardId: c.id }}
                    aria-label={`${c.title}の詳細を見る`}
                    className="block min-w-0"
                  >
                    {children}
                  </Link>
                )}
              />
              <div className="mt-1 w-full min-w-0">
                <CardStats
                  compact
                  attack={c.monthlyPageviews}
                  defense={c.articleLength}
                  element={c.element}
                />
              </div>
              {c.listedCount > 0 && (
                <span className="mt-1 text-xs font-bold text-amber-600">出品中{c.listedCount}</span>
              )}
            </div>
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
