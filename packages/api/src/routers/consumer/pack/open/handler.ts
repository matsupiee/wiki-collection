import { cardDiscovery, pack, packOpening, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { ProtectedContext } from "../../../../context";
import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { prepareCoinWithdraw } from "../../../../shared/coin/prepare-coin-withdraw";
import { runBatch } from "../../../../shared/coin/run-batch";
import { consumeFreePack } from "../../../../shared/pack/consume-free-pack";
import { drawPackCards, type Random } from "../../../../shared/pack/draw-pack-cards";
import { restoreFreePack } from "../../../../shared/pack/restore-free-pack";
import type { PackOpenInput, PackOpenOutput } from "./route";

// 支払いと抽選をサーバーで済ませて結果を保存する。画面の演出は保存済みの結果を見せるだけなので、リロードしても引き直しにならない
export async function handler({
  input,
  ctx,
  random,
}: {
  input: PackOpenInput;
  ctx: ProtectedContext;
  random?: Random;
}): Promise<PackOpenOutput> {
  const now = new Date();
  const userId = ctx.session.user.id;
  const [found] = await ctx.db
    .select()
    .from(pack)
    .where(and(eq(pack.id, input.packId), eq(pack.isActive, true)));
  if (!found || (found.startsAt && found.startsAt > now) || (found.endsAt && found.endsAt <= now)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "パックが見つかりません" });
  }

  const price = found.type === "premium" ? (found.priceCoins ?? 0) : 0;
  if (price > 0 && (await getCoinBalance(ctx.db, userId)).total < price) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "pt が足りません" });
  }

  const drawn = await drawPackCards(ctx.db, found, random);
  const payment = found.type === "free_basic" ? await consumeFreePack(ctx.db, userId, now) : "coin";

  let newUserCardIds: string[];
  let openingId: string | undefined;
  try {
    const [opening] = await ctx.db
      .insert(packOpening)
      .values({ userId, packId: found.id, payment, coinsSpent: price })
      .returning({ id: packOpening.id });
    openingId = opening!.id;

    const rows = drawn.map(({ cardId }) => ({ userId, cardId, packOpeningId: opening!.id }));
    const discoveries = [...new Set(drawn.map((d) => d.cardId))].map((cardId) => ({
      userId,
      cardId,
      firstAcquiredAt: now,
    }));
    const payments: BatchItem<"sqlite">[] = [];
    if (price > 0) {
      payments.push(
        ...(await prepareCoinWithdraw(ctx.db, {
          userId,
          amount: price,
          purpose: "pack_open",
          packOpeningId: openingId,
        })),
      );
    }
    const [acquired, discovered] = await runBatch(ctx.db, [
      ctx.db.insert(userCard).values(rows).returning({ id: userCard.id, cardId: userCard.cardId }),
      ctx.db
        .insert(cardDiscovery)
        .values(discoveries)
        .onConflictDoNothing()
        .returning({ cardId: cardDiscovery.cardId }),
      ...payments,
    ]);
    const newCards = new Set(discovered.map((row) => row.cardId));
    // 開封詳細と同じ ID 昇順で、重複カードの先頭だけに NEW を付ける。
    newUserCardIds = acquired
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .filter((row) => newCards.delete(row.cardId))
      .map((row) => row.id);
  } catch (error) {
    if (openingId) await ctx.db.delete(packOpening).where(eq(packOpening.id, openingId));
    if (payment !== "coin") await restoreFreePack(ctx.db, userId);
    throw error;
  }

  const commonIds = [...new Set(drawn.filter((c) => c.rarity === "common").map((c) => c.cardId))];
  if (commonIds.length) ctx.cacheCommonImages?.(commonIds);
  return { openingId, newUserCardIds };
}
