import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { formatPrice, formatPt } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/shop")({
  component: ShopPage,
});

function ShopPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const products = useQuery(trpc.shop.listProducts.queryOptions());
  const balance = useQuery(trpc.coin.getBalance.queryOptions());
  const [selected, setSelected] = useState<string | null>(null);
  const purchase = useMutation(
    trpc.shop.purchase.mutationOptions({
      onSuccess: async ({ coins }) => {
        setSelected(null);
        await queryClient.invalidateQueries();
        toast.success(`${formatPt(coins)} を購入しました`);
      },
      onError: (error) => {
        setSelected(null);
        toast.error(error.message);
      },
    }),
  );

  if (!products.data || !balance.data) return <Loader />;
  const product = products.data.products.find((p) => p.id === selected);

  return (
    <div className="pb-8">
      <PageHeader title="ショップ" />
      <section className="mx-4 rounded-3xl bg-gradient-to-br from-amber-100 to-white p-5 shadow-sm">
        <p className="text-xs font-bold text-slate-500">pt 残高</p>
        <p className="text-3xl font-black" data-testid="shop-balance">
          {formatPt(balance.data.total)}
        </p>
        <p className="text-xs text-slate-500">
          有償 {formatPt(balance.data.paid)}・無償 {formatPt(balance.data.free)}
        </p>
      </section>
      <ul className="mx-4 mt-4 space-y-2">
        {products.data.products.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!products.data.purchasable}
              onClick={() => setSelected(p.id)}
              className="flex w-full items-center justify-between rounded-2xl bg-white/90 px-5 py-4 shadow-sm disabled:opacity-50"
            >
              <span className="text-lg font-black">{formatPt(p.coins)}</span>
              <span className="rounded-full bg-sky-500 px-4 py-1 text-sm font-extrabold text-white">
                {formatPrice(p.priceAmount, p.currency)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-4 mt-4 space-y-1 text-[11px] leading-relaxed text-slate-500">
        {!products.data.purchasable && (
          <p className="font-bold text-rose-500">現在 pt は購入できません。</p>
        )}
        {products.data.purchasable && (
          <p className="font-bold text-amber-600">開発環境のため、実際の支払いは行われません。</p>
        )}
        <p>
          購入した pt は払い戻しできません。pt
          は有料パックの開封とマーケットでの購入・入札に使えます。
        </p>
        <p>支払いは無償 pt から先に使われます。</p>
        <div className="flex gap-3 pt-2 font-bold text-sky-600">
          <Link to="/legal/tokushoho">特定商取引法に基づく表記</Link>
          <Link to="/legal/payment-services">資金決済法に基づく表示</Link>
        </div>
      </div>
      <ConfirmDialog
        open={!!product}
        title="pt を購入します"
        confirmLabel="購入する"
        pending={purchase.isPending}
        onConfirm={() => product && purchase.mutate({ productId: product.id })}
        onCancel={() => setSelected(null)}
      >
        {product &&
          `${formatPt(product.coins)} を ${formatPrice(product.priceAmount, product.currency)} で購入します。`}
      </ConfirmDialog>
    </div>
  );
}
