import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { formatDateTime, formatPt } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/me/wallet")({
  component: WalletPage,
});

const depositLabels = {
  purchase: "購入",
  card_redeem: "カードの還元",
  market_sale: "マーケットの売上",
  bid_refund: "入札の返金",
  admin_grant: "運営からの付与",
} as const;

const withdrawLabels = {
  pack_open: "パックの開封",
  market_buy: "マーケットで購入",
  auction_bid: "オークションに入札",
  admin_revoke: "運営による調整",
} as const;

function WalletPage() {
  const trpc = useTRPC();
  const balance = useQuery(trpc.coin.getBalance.queryOptions());
  const history = useQuery(trpc.coin.listHistory.queryOptions());
  if (!balance.data || !history.data) return <Loader />;
  return (
    <div className="pb-8">
      <PageHeader title="pt の履歴" back="/me" />
      <section className="mx-4 rounded-3xl bg-white/90 p-5 shadow-sm">
        <p className="text-3xl font-black">{formatPt(balance.data.total)}</p>
        <p className="text-xs text-slate-500">
          有償 {formatPt(balance.data.paid)}・無償 {formatPt(balance.data.free)}
        </p>
      </section>
      <ul
        className="mx-4 mt-4 divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white/90 shadow-sm"
        data-testid="coin-history"
      >
        {history.data.entries.length === 0 && (
          <li className="p-6 text-center text-xs text-slate-400">履歴はありません</li>
        )}
        {history.data.entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-bold">
                {e.kind === "deposit" ? depositLabels[e.source] : withdrawLabels[e.purpose]}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatDateTime(e.createdAt)}
                {e.kind === "deposit"
                  ? `・${e.isPaid ? "有償" : "無償"}`
                  : `・有償 ${e.paidAmount} / 無償 ${e.freeAmount}`}
              </p>
            </div>
            <span
              className={
                e.kind === "deposit" ? "font-black text-emerald-600" : "font-black text-rose-500"
              }
            >
              {e.kind === "deposit" ? "+" : "-"}
              {formatPt(e.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
