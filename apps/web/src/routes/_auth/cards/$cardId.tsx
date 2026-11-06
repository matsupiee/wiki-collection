import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wiki-collection/ui/components/button";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ElementBadge } from "@/components/element-badge";
import { CardStats, StatIcon, statNumber } from "@/components/card-stats";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { RarityMarks } from "@/components/rarity-marks";
import { WikiCard } from "@/components/wiki-card";
import { formatPageviews, formatPt, rarityLabels } from "@/lib/format";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/cards/$cardId")({
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState("");
  const detail = useQuery(trpc.card.get.queryOptions({ cardId }));
  const redeem = useMutation(
    trpc.card.redeem.mutationOptions({
      onSuccess: async ({ points }) => {
        setConfirming(false);
        setSelectedCopy("");
        await queryClient.invalidateQueries();
        toast.success(`${formatPt(points)} を受け取りました`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (detail.isError) {
    return (
      <div>
        <PageHeader back="/collection" hideBrand />
        <p className="p-8 text-center text-sm text-slate-500">{detail.error.message}</p>
      </div>
    );
  }
  if (!detail.data) return <Loader />;
  const { card, ownedUserCardIds, listedCount, redeemPoints, lowestMarketPrice } = detail.data;
  const firstOwned =
    detail.data.ownedCopies.find((c) => c.id === selectedCopy && !c.inTeam)?.id ??
    (selectedCopy ? undefined : detail.data.ownedCopies.find((c) => !c.inTeam)?.id);

  return (
    <div className="pb-8">
      <PageHeader back="/collection" hideBrand />
      <div className="flex justify-center px-6 pt-2">
        <WikiCard card={card} size="lg" />
      </div>
      <section className="mx-4 mt-6 space-y-2 rounded-3xl bg-white/85 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <ElementBadge element={card.element} />
            <h1 className="min-w-0 break-words text-xl font-black">{card.title}</h1>
            <a
              href={card.wikiUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Wikipediaで読む（新しいタブで開く）"
              title="Wikipediaで読む"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sky-600 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
            <RarityMarks rarity={card.rarity} /> {rarityLabels[card.rarity]}
          </span>
        </div>
        <p className="text-xs text-slate-500">月間 {formatPageviews(card.monthlyPageviews)} 閲覧</p>
        <CardStats
          prominent
          attack={card.monthlyPageviews}
          defense={card.articleLength}
          element={card.element}
        />
        <p className="text-sm leading-relaxed text-slate-700">{card.summary}</p>
      </section>

      <section className="mx-4 mt-4 rounded-3xl bg-white/85 p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700" data-testid="owned-count">
          所持 {ownedUserCardIds.length}枚{listedCount > 0 && `（ほかに出品中 ${listedCount}枚）`}
        </p>
        <ul className="mt-3 space-y-2 text-xs text-slate-600">
          {detail.data.ownedCopies.map((c) => (
            <li key={c.id}>
              #{c.id.slice(-5)} <StatIcon stat="attack" /> +{statNumber(c.attackBonus)}{" "}
              <StatIcon stat="defense" /> +{statNumber(c.defenseBonus)}
              {c.inTeam && " · 編成中"}
            </li>
          ))}
        </ul>
        {detail.data.ownedCopies.length > 0 && (
          <label className="mt-3 block text-xs text-slate-500">
            出品・還元する1枚
            <select
              aria-label="出品・還元する1枚"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
              value={selectedCopy || firstOwned || ""}
              onChange={(e) => setSelectedCopy(e.target.value)}
            >
              <option value="">カードを選ぶ</option>
              {detail.data.ownedCopies.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={c.inTeam}
                  aria-label={`#${c.id.slice(-5)} 攻撃 +${statNumber(c.attackBonus)} 防御 +${statNumber(c.defenseBonus)}${c.inTeam ? "（編成中）" : ""}`}
                >
                  #{c.id.slice(-5)} ⚔ +{statNumber(c.attackBonus)} / 🛡 +{statNumber(c.defenseBonus)}
                  {c.inTeam ? "（編成中）" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link to="/battle" className="mt-3 block text-sm font-bold text-sky-700">
          チームを編成・カードを合成する →
        </Link>
        <div className="mt-3 flex gap-3">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-full font-extrabold"
            disabled={!firstOwned}
            onClick={() => setConfirming(true)}
          >
            還元する {formatPt(redeemPoints)}
          </Button>
          <Button
            className="h-11 flex-1 rounded-full bg-sky-500 font-extrabold text-white hover:bg-sky-600"
            disabled={!firstOwned}
            onClick={() =>
              firstOwned &&
              navigate({ to: "/market/new", search: { userCardId: firstOwned, cardId: card.id } })
            }
          >
            出品する
          </Button>
        </div>
        {lowestMarketPrice !== null && (
          <Link
            to="/market"
            search={{ cardId: card.id, format: "fixed_price" }}
            className="mt-3 block text-center text-xs font-bold text-slate-500"
          >
            マーケットの最安値 {formatPt(lowestMarketPrice)} ›
          </Link>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="カードを還元します"
        confirmLabel="還元する"
        pending={redeem.isPending}
        onConfirm={() => firstOwned && redeem.mutate({ userCardId: firstOwned })}
        onCancel={() => setConfirming(false)}
      >
        「{card.title}」を1枚手放して {formatPt(redeemPoints)} を受け取ります。
      </ConfirmDialog>
    </div>
  );
}
