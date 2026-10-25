import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { formatPt } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export function BalanceBadge() {
  const trpc = useTRPC();
  const balance = useQuery(trpc.coin.getBalance.queryOptions());
  return (
    <Link
      to="/shop"
      className="flex items-center gap-1.5 rounded-full bg-white/90 py-1 pr-3 pl-1 text-sm font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200"
      aria-label="pt 残高"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[11px] text-white">
        pt
      </span>
      <span data-testid="balance">{balance.data ? formatPt(balance.data.total) : "…"}</span>
    </Link>
  );
}
