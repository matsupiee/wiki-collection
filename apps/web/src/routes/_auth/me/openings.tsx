import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { RarityMarks } from "@/components/rarity-marks";
import { formatDateTime } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/me/openings")({
  component: OpeningHistoryPage,
});

function OpeningHistoryPage() {
  const trpc = useTRPC();
  const openings = useQuery(trpc.opening.list.queryOptions());
  if (!openings.data) return <Loader />;
  return (
    <div className="pb-8">
      <PageHeader title="開封履歴" back="/me" />
      <ul className="mx-4 space-y-2" data-testid="opening-history">
        {openings.data.openings.length === 0 && (
          <li className="rounded-2xl bg-white/80 p-6 text-center text-xs text-slate-400">
            まだ開封していません
          </li>
        )}
        {openings.data.openings.map((o) => (
          <li key={o.id} className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">{o.packName}</p>
              <p className="text-[11px] text-slate-400">{formatDateTime(o.createdAt)}</p>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {o.cards.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5"
                >
                  {o.revealed ? c.title : "？"} {o.revealed && <RarityMarks rarity={c.rarity} />}
                </li>
              ))}
            </ul>
            {o.revealed ? (
              <Link
                to="/openings/$openingId/result"
                params={{ openingId: o.id }}
                className="mt-2 block text-xs font-bold text-sky-600"
              >
                結果を見る ›
              </Link>
            ) : (
              <Link
                to="/openings/$openingId"
                params={{ openingId: o.id }}
                className="mt-2 block text-xs font-bold text-violet-600"
              >
                続きを見る ›
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
