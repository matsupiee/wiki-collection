import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { rarities, type Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { WikiCard } from "@/components/wiki-card";
import { formatPt, rarityLabels } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/collection")({
  validateSearch: z.object({ tab: z.enum(["owned", "dex"]).optional() }),
  component: CollectionPage,
});

function CollectionPage() {
  const { tab = "owned" } = Route.useSearch();
  return (
    <div>
      <PageHeader title="コレクション" />
      <div className="mx-4 mb-4 grid grid-cols-2 rounded-full bg-white/80 p-1 text-sm font-bold shadow-sm">
        {(["owned", "dex"] as const).map((t) => (
          <Link
            key={t}
            to="/collection"
            search={{ tab: t }}
            className={cn(
              "rounded-full py-2 text-center",
              tab === t ? "bg-sky-500 text-white" : "text-slate-500",
            )}
          >
            {t === "owned" ? "所持カード" : "図鑑"}
          </Link>
        ))}
      </div>
      {tab === "owned" ? <OwnedTab /> : <DexTab />}
    </div>
  );
}

function OwnedTab() {
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
              className="flex flex-col items-center"
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

const GENRES_SHOWN = 9;

function DexTab() {
  const trpc = useTRPC();
  const [genreId, setGenreId] = useState<string | undefined>();
  const [showAllGenres, setShowAllGenres] = useState(false);
  const dex = useQuery(trpc.card.listDex.queryOptions({ genreId }));
  if (!dex.data) return <Loader />;
  const total = dex.data.genres.reduce((sum, g) => sum + g.total, 0);
  const discovered = dex.data.genres.reduce((sum, g) => sum + g.discovered, 0);
  const genreById = new Map(dex.data.genres.map((g) => [g.id, g]));
  // ジャンルは Wikidata の分類なので数が多い。カードの多い順に並んでいるので、たたんでいるときは上位と選んだジャンルだけを出す
  const genres = dex.data.genres.filter((g) => g.total > 0);
  const visibleGenres = showAllGenres
    ? genres
    : genres.filter((g, i) => i < GENRES_SHOWN || g.id === genreId);

  return (
    <div className="px-4 pb-6">
      <p className="mb-3 text-center text-sm font-bold text-slate-600" data-testid="dex-progress">
        コンプリート {discovered} / {total}
      </p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {visibleGenres.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGenreId(genreId === g.id ? undefined : g.id)}
            className={cn(
              "rounded-2xl bg-white p-2 text-left shadow-sm ring-2",
              genreId === g.id ? "ring-sky-400" : "ring-transparent",
            )}
          >
            <span className="block text-xs font-extrabold" style={{ color: g.colorHex }}>
              {g.name}
            </span>
            <span className="text-[10px] text-slate-500">
              {g.discovered}/{g.total}
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${g.total ? (g.discovered / g.total) * 100 : 0}%`,
                  background: g.colorHex,
                }}
              />
            </span>
          </button>
        ))}
      </div>
      {genres.length > GENRES_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAllGenres(!showAllGenres)}
          className="mb-4 w-full rounded-2xl bg-white/80 py-2 text-xs font-bold text-slate-600 shadow-sm"
          data-testid="dex-toggle-genres"
        >
          {showAllGenres ? "ジャンルをたたむ" : `すべてのジャンルを見る（${genres.length}）`}
        </button>
      )}
      <div className="grid grid-cols-4 gap-2">
        {dex.data.cards.map((c) => {
          const g = genreById.get(c.genreId)!;
          return c.discovered ? (
            <Link key={c.id} to="/cards/$cardId" params={{ cardId: c.id }}>
              <WikiCard
                card={{
                  title: c.title!,
                  rarity: c.rarity,
                  imageUrl: c.imageUrl,
                  genreName: g.name,
                  genreColorHex: g.colorHex,
                }}
                size="sm"
                className="w-full"
              />
            </Link>
          ) : (
            <div
              key={c.id}
              className="flex aspect-[63/88] items-center justify-center rounded-lg bg-slate-300/60 text-xl font-black text-white"
              aria-label="未発見のカード"
            >
              ?
            </div>
          );
        })}
      </div>
    </div>
  );
}
