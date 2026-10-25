import { cardDiscovery, pack, packOpening, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
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

  let openingId: string | undefined;
  try {
    const [opening] = await ctx.db
      .insert(packOpening)
      .values({ userId, packId: found.id, payment, coinsSpent: price })
      .returning({ id: packOpening.id });
    openingId = opening!.id;

    const discovered = await ctx.db
      .select({ cardId: cardDiscovery.cardId })
      .from(cardDiscovery)
      .where(
        and(
          eq(cardDiscovery.userId, userId),
          inArray(
            cardDiscovery.cardId,
            drawn.map((d) => d.cardId),
          ),
        ),
      );
    // すでに持っていたカードと、同じパックの2枚目以降は NEW にしない
    const seen = new Set(discovered.map((d) => d.cardId));
    const rows = drawn.map((d, index) => {
      const isNew = !seen.has(d.cardId);
      seen.add(d.cardId);
      return {
        userId,
        cardId: d.cardId,
        packOpeningId: openingId,
        slot: index + 1,
        isNewOnAcquire: isNew,
      };
    });

    const discoveries = rows
      .filter((r) => r.isNewOnAcquire)
      .map((r) => ({ userId, cardId: r.cardId, firstAcquiredAt: now }));
    const queries: BatchItem<"sqlite">[] = [ctx.db.insert(userCard).values(rows)];
    if (discoveries.length > 0) {
      queries.push(ctx.db.insert(cardDiscovery).values(discoveries).onConflictDoNothing());
    }
    if (price > 0) {
      queries.push(
        ...(await prepareCoinWithdraw(ctx.db, {
          userId,
          amount: price,
          purpose: "pack_open",
          packOpeningId: openingId,
        })),
      );
    }
    await runBatch(ctx.db, queries);
  } catch (error) {
    if (openingId) await ctx.db.delete(packOpening).where(eq(packOpening.id, openingId));
    if (payment !== "coin") await restoreFreePack(ctx.db, userId, payment, now);
    throw error;
  }

  return { openingId };
}
