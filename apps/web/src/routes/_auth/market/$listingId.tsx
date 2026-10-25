import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";
import { Input } from "@wiki-collection/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { WikiCard } from "@/components/wiki-card";
import { formatDateTime, formatDuration, formatPt } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/market/$listingId")({
  component: ListingPage,
});

function ListingPage() {
  const { listingId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const now = useNow();
  const [confirm, setConfirm] = useState<null | "buy" | "bid" | "cancel">(null);
  const [bidInput, setBidInput] = useState("");
  const detail = useQuery(trpc.market.get.queryOptions({ listingId }));
  const onDone = (message: string) => async () => {
    setConfirm(null);
    await queryClient.invalidateQueries();
    toast.success(message);
  };
  const onError = (error: { message: string }) => {
    setConfirm(null);
    toast.error(error.message);
  };
  const buy = useMutation(
    trpc.market.buy.mutationOptions({ onSuccess: onDone("購入しました"), onError }),
  );
  const bid = useMutation(
    trpc.market.bid.mutationOptions({ onSuccess: onDone("入札しました"), onError }),
  );
  const cancel = useMutation(
    trpc.market.cancelListing.mutationOptions({
      onSuccess: onDone("出品を取り下げました"),
      onError,
    }),
  );

  if (!detail.data) return <Loader />;
  const { listing, card, bids, minNextBid, isLeading, balance } = detail.data;
  const bidAmount = Number(bidInput || minNextBid || 0);
  const price = listing.format === "fixed_price" ? (listing.price ?? 0) : bidAmount;
  const remaining = listing.endsAt ? new Date(listing.endsAt).getTime() - now : 0;
  const active = listing.status === "active";

  return (
    <div className="pb-8">
      <PageHeader back="/market" />
      <div className="flex justify-center pt-2">
        <WikiCard card={card} size="md" interactive />
      </div>
      <section className="mx-4 mt-5 space-y-3 rounded-3xl bg-white/90 p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-slate-500">
            {listing.format === "fixed_price" ? "フリマ" : "オークション"}・出品者{" "}
            {listing.sellerName}
          </span>
          {!active && (
            <span
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500"
              data-testid="listing-status"
            >
              {listing.status === "sold"
                ? listing.isBuyer
                  ? "あなたが購入しました"
                  : "売り切れ"
                : "終了しました"}
            </span>
          )}
        </div>

        {listing.format === "fixed_price" ? (
          <p className="text-3xl font-black">{formatPt(listing.price ?? 0)}</p>
        ) : (
          <div>
            <p className="text-xs text-slate-500">
              {listing.bidCount > 0 ? "現在価格" : "開始価格"}
            </p>
            <p className="text-3xl font-black">
              {formatPt(listing.currentPrice ?? listing.startPrice ?? 0)}
            </p>
            {active && (
              <p className="text-xs font-bold text-rose-500" data-testid="time-left">
                残り {formatDuration(remaining)}
              </p>
            )}
            {isLeading && (
              <p className="mt-1 text-xs font-bold text-emerald-600">あなたが最高額です</p>
            )}
          </div>
        )}

        {active && listing.isMine && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-full font-extrabold"
            disabled={listing.bidCount > 0}
            onClick={() => setConfirm("cancel")}
          >
            {listing.bidCount > 0 ? "入札があるため取り下げられません" : "出品を取り下げる"}
          </Button>
        )}

        {active &&
          !listing.isMine &&
          listing.format === "fixed_price" &&
          (balance >= price ? (
            <Button
              className="h-11 w-full rounded-full bg-sky-500 font-extrabold text-white"
              onClick={() => setConfirm("buy")}
            >
              購入する
            </Button>
          ) : (
            <Link to="/shop">
              <Button className="h-11 w-full rounded-full bg-amber-400 font-extrabold text-white">
                pt を購入する
              </Button>
            </Link>
          ))}

        {active && !listing.isMine && listing.format === "auction" && !isLeading && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500" htmlFor="bid">
              入札額（{formatPt(minNextBid ?? 0)} 以上）
            </label>
            <div className="flex gap-2">
              <Input
                id="bid"
                type="number"
                inputMode="numeric"
                min={minNextBid ?? 1}
                placeholder={String(minNextBid ?? "")}
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                className="h-11 rounded-full"
              />
              {balance >= bidAmount ? (
                <Button
                  className="h-11 rounded-full bg-sky-500 px-6 font-extrabold text-white"
                  disabled={!minNextBid || bidAmount < minNextBid}
                  onClick={() => setConfirm("bid")}
                >
                  入札
                </Button>
              ) : (
                <Link to="/shop">
                  <Button className="h-11 rounded-full bg-amber-400 font-extrabold text-white">
                    pt を購入
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400">残高 {formatPt(balance)}</p>
      </section>

      {listing.format === "auction" && (
        <section className="mx-4 mt-4 rounded-3xl bg-white/90 p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold">入札履歴</h2>
          {bids.length === 0 ? (
            <p className="text-xs text-slate-500">まだ入札はありません</p>
          ) : (
            <ul className="space-y-1 text-sm" data-testid="bid-history">
              {bids.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span className={b.isMine ? "font-bold text-sky-600" : ""}>{b.bidderName}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(b.createdAt)}</span>
                  <span className="font-bold">{formatPt(b.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirm === "buy"}
        title="購入します"
        confirmLabel="購入する"
        pending={buy.isPending}
        onConfirm={() => buy.mutate({ listingId })}
        onCancel={() => setConfirm(null)}
      >
        「{card.title}」を {formatPt(price)} で購入します。
        <br />
        購入後の残高 {formatPt(balance - price)}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "bid"}
        title="入札します"
        confirmLabel="入札する"
        pending={bid.isPending}
        onConfirm={() => bid.mutate({ listingId, amount: bidAmount })}
        onCancel={() => setConfirm(null)}
      >
        {formatPt(bidAmount)}{" "}
        で入札します。入札額はすぐに残高から支払われ、ほかの人に抜かれたら戻ります。
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "cancel"}
        title="出品を取り下げます"
        confirmLabel="取り下げる"
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate({ listingId })}
        onCancel={() => setConfirm(null)}
      >
        カードは所持中に戻ります。
      </ConfirmDialog>
    </div>
  );
}
