import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@wiki-collection/ui/lib/utils";
import { Search } from "lucide-react";
import { useState } from "react";
import z from "zod";

import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { RarityMarks } from "@/components/rarity-marks";
import { WikiCard } from "@/components/wiki-card";
import { formatDuration, formatPt } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { useTRPC } from "@/utils/trpc";

const sortOptions = {
  fixed_price: [
    ["newest", "新着順"],
    ["price_asc", "安い順"],
  ],
  auction: [
    ["ending_soon", "終了が近い順"],
    ["most_bids", "入札が多い順"],
    ["price_asc", "安い順"],
  ],
} as const;

export const Route = createFileRoute("/_auth/market/")({
  validateSearch: z.object({
    format: z.enum(["fixed_price", "auction"]).optional(),
    cardId: z.string().optional(),
  }),
  component: MarketPage,
});

function MarketPage() {
  const { format = "fixed_price", cardId } = Route.useSearch();
  const navigate = useNavigate({ from: "/market/" });
  const trpc = useTRPC();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "ending_soon" | "most_bids">("newest");
  const effectiveSort = sortOptions[format].some(([key]) => key === sort)
    ? sort
    : sortOptions[format][0][0];
  const listings = useQuery(
    trpc.market.list.queryOptions({
      format,
      query: query || undefined,
      cardId,
      sort: effectiveSort,
    }),
  );

  return (
    <div className="pb-6">
      <PageHeader title="マーケット" />
      <div className="mx-4 mb-3 grid grid-cols-2 rounded-full bg-white/80 p-1 text-sm font-bold shadow-sm">
        {(["fixed_price", "auction"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => navigate({ search: { format: f } })}
            className={cn(
              "rounded-full py-2",
              format === f ? "bg-sky-500 text-white" : "text-slate-500",
            )}
          >
            {f === "fixed_price" ? "フリマ" : "オークション"}
          </button>
        ))}
      </div>
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="カード名で検索"
          className="w-full bg-transparent text-sm outline-none"
          aria-label="カード名で検索"
        />
      </div>
      <div className="mx-4 mb-3 flex gap-2 text-xs font-bold">
        {sortOptions[format].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "rounded-full px-3 py-1",
              effectiveSort === key ? "bg-slate-800 text-white" : "bg-white text-slate-500",
            )}
          >
            {label}
          </button>
        ))}
        {cardId && (
          <button
            type="button"
            onClick={() => navigate({ search: { format } })}
            className="ml-auto text-sky-600"
          >
            絞り込みを解除
          </button>
        )}
      </div>
      {!listings.data ? (
        <Loader />
      ) : listings.data.listings.length === 0 ? (
        <p className="mx-4 rounded-3xl bg-white/80 p-8 text-center text-sm text-slate-500">
          出品はまだありません
        </p>
      ) : (
        <ul className="mx-4 space-y-2" data-testid="market-listings">
          {listings.data.listings.map((l) => (
            <li key={l.id}>
              <Link
                to="/market/$listingId"
                params={{ listingId: l.id }}
                className="flex items-center gap-3 rounded-2xl bg-white/90 p-2 shadow-sm"
              >
                <WikiCard card={l.card} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-extrabold">
                    {l.card.title} <RarityMarks rarity={l.card.rarity} />
                  </p>
                  <p className="text-xs text-slate-500">
                    出品者 {l.sellerName}
                    {l.isMine && <span className="ml-1 font-bold text-amber-600">自分の出品</span>}
                  </p>
                  {l.format === "auction" && l.endsAt && (
                    <p className="text-xs text-slate-500">
                      入札 {l.bidCount}件・残り {formatDuration(new Date(l.endsAt).getTime() - now)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {l.format === "auction" && <p className="text-[10px] text-slate-400">現在</p>}
                  <p className="text-base font-black text-slate-800">{formatPt(l.price)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
