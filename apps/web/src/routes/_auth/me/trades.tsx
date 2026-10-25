import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { RarityMarks } from "@/components/rarity-marks";
import { formatDuration, formatPt } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/me/trades")({
  component: TradesPage,
});

const statusLabels = {
  active: "出品中",
  sold: "取引成立",
  cancelled: "取り下げ",
  expired: "期限切れ",
} as const;

function TradesPage() {
  const trpc = useTRPC();
  const now = useNow();
  const mine = useQuery(trpc.market.listMine.queryOptions());
  if (!mine.data) return <Loader />;
  const sections = [
    { title: "出品したもの", items: mine.data.selling, testId: "selling" },
    { title: "入札中", items: mine.data.bidding, testId: "bidding" },
    { title: "買ったもの", items: mine.data.bought, testId: "bought" },
  ];
  return (
    <div className="pb-8">
      <PageHeader title="出品・入札の管理" back="/me" />
      {sections.map((section) => (
        <section key={section.title} className="mx-4 mb-4" data-testid={section.testId}>
          <h2 className="mb-2 text-sm font-extrabold text-slate-600">{section.title}</h2>
          {section.items.length === 0 ? (
            <p className="rounded-2xl bg-white/80 p-4 text-center text-xs text-slate-400">
              ありません
            </p>
          ) : (
            <ul className="space-y-2">
              {section.items.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/market/$listingId"
                    params={{ listingId: l.id }}
                    className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold">
                        {l.card.title} <RarityMarks rarity={l.card.rarity} />
                      </p>
                      <p className="text-xs text-slate-500">
                        {l.format === "auction" ? "オークション" : "フリマ"}・
                        {statusLabels[l.status]}
                        {l.status === "active" &&
                          l.endsAt &&
                          `・残り ${formatDuration(new Date(l.endsAt).getTime() - now)}`}
                        {"isLeading" in l && (l.isLeading ? "・最高額" : "・抜かれました")}
                      </p>
                    </div>
                    <span className="font-black">{formatPt(l.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
