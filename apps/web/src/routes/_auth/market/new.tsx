import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";
import { Input } from "@wiki-collection/ui/components/input";
import { cn } from "@wiki-collection/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { WikiCard } from "@/components/wiki-card";
import { formatPt } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

// 手数料率は API（shared/market/calculate-market-fee.ts）と同じ値
const FEE_RATE = 0.1;

export const Route = createFileRoute("/_auth/market/new")({
  validateSearch: z.object({ userCardId: z.string(), cardId: z.string() }),
  component: NewListingPage,
});

function NewListingPage() {
  const { userCardId, cardId } = Route.useSearch();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [format, setFormat] = useState<"fixed_price" | "auction">("fixed_price");
  const [price, setPrice] = useState("");
  const [durationHours, setDurationHours] = useState<24 | 72 | 168>(72);
  const create = useMutation(
    trpc.market.createListing.mutationOptions({
      onSuccess: async ({ listingId }) => {
        await queryClient.invalidateQueries();
        toast.success("出品しました");
        navigate({ to: "/market/$listingId", params: { listingId } });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const detail = useQuery(trpc.card.get.queryOptions({ cardId }));

  if (!detail.data) return <Loader />;
  const { card } = detail.data;
  const amount = Number(price);
  const fee = Math.floor(amount * FEE_RATE);
  const valid = Number.isInteger(amount) && amount >= 1;

  return (
    <div className="pb-8">
      <PageHeader title="出品" back="/collection" />
      <div className="mx-4 space-y-4">
        <div className="flex items-center gap-3 rounded-3xl bg-white/90 p-3 shadow-sm">
          <WikiCard card={card} size="xs" />
          <div className="text-sm">
            <p className="font-extrabold">{card.title}</p>
            <p className="text-xs text-slate-500">
              還元 {formatPt(detail.data.redeemPoints)}
              {detail.data.lowestMarketPrice !== null &&
                `・最安値 ${formatPt(detail.data.lowestMarketPrice)}`}
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-white/90 p-5 shadow-sm">
          <p className="mb-2 text-xs font-bold text-slate-500">形式</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
            {(["fixed_price", "auction"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded-full py-2 ring-2",
                  format === f ? "bg-sky-50 text-sky-600 ring-sky-400" : "ring-slate-200",
                )}
              >
                {f === "fixed_price" ? "フリマ" : "オークション"}
              </button>
            ))}
          </div>
          <label className="mt-4 mb-2 block text-xs font-bold text-slate-500" htmlFor="price">
            {format === "fixed_price" ? "価格" : "開始価格"}（pt）
          </label>
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-11 rounded-full"
          />
          {format === "auction" && (
            <>
              <p className="mt-4 mb-2 text-xs font-bold text-slate-500">期間</p>
              <div className="grid grid-cols-3 gap-2 text-sm font-bold">
                {([24, 72, 168] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDurationHours(h)}
                    className={cn(
                      "rounded-full py-2 ring-2",
                      durationHours === h
                        ? "bg-sky-50 text-sky-600 ring-sky-400"
                        : "ring-slate-200",
                    )}
                  >
                    {h / 24}日
                  </button>
                ))}
              </div>
            </>
          )}
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <dt>手数料（10%）</dt>
              <dd>-{formatPt(valid ? fee : 0)}</dd>
            </div>
            <div className="flex justify-between font-extrabold">
              <dt>{format === "fixed_price" ? "受け取り" : "受け取り（開始価格で落札のとき）"}</dt>
              <dd>{formatPt(valid ? amount - fee : 0)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-400">
            出品中のカードは還元できません。入札が入ったオークションは取り下げられません。
          </p>
        </div>
        <Button
          className="h-12 w-full rounded-full bg-sky-500 text-base font-extrabold text-white"
          disabled={!valid || create.isPending}
          onClick={() =>
            create.mutate(
              format === "fixed_price"
                ? { format, userCardId, price: amount }
                : { format, userCardId, startPrice: amount, durationHours },
            )
          }
        >
          出品する
        </Button>
      </div>
    </div>
  );
}
