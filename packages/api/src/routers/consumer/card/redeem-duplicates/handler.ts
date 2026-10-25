import { card, coinDeposit, userCard } from "@wiki-collection/db/schema/index";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getRedeemPoints } from "../../../../shared/card/get-redeem-points";
import type { CardRedeemDuplicatesOutput } from "./route";

export async function handler({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<CardRedeemDuplicatesOutput> {
  const userId = ctx.session.user.id;
  const copies = await ctx.db
    .select({
      id: userCard.id,
      cardId: userCard.cardId,
      status: userCard.status,
      rarity: card.rarity,
    })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .where(and(eq(userCard.userId, userId), inArray(userCard.status, ["owned", "listed"])))
    .orderBy(asc(userCard.createdAt));

  // 出品中のカードがあればそれを残す1枚とみなし、なければいちばん古い1枚を残す
  const targetIds: string[] = [];
  const cardIds = new Set(copies.map((c) => c.cardId));
  for (const cardId of cardIds) {
    const sameCard = copies.filter((c) => c.cardId === cardId);
    const owned = sameCard.filter((c) => c.status === "owned");
    const keepOne = sameCard.some((c) => c.status === "listed") ? 0 : 1;
    targetIds.push(...owned.slice(keepOne).map((c) => c.id));
  }
  if (targetIds.length === 0) return { count: 0, points: 0 };

  // D1 は1文あたりのバインド変数が 100 個までなので、更新を分けて実行する
  const redeemedAt = new Date();
  const redeemed: { id: string }[] = [];
  for (let i = 0; i < targetIds.length; i += 50) {
    redeemed.push(
      ...(await ctx.db
        .update(userCard)
        .set({ status: "redeemed", redeemedAt })
        .where(
          and(
            inArray(userCard.id, targetIds.slice(i, i + 50)),
            eq(userCard.userId, userId),
            eq(userCard.status, "owned"),
          ),
        )
        .returning({ id: userCard.id })),
    );
  }
  if (redeemed.length === 0) return { count: 0, points: 0 };

  // まとめて還元した分は1つの獲得にする。消費のたびに細かい獲得へ割り当てが散らばらないようにするため
  const rarityById = new Map(copies.map((c) => [c.id, c.rarity]));
  const points = redeemed.reduce((sum, r) => sum + getRedeemPoints(rarityById.get(r.id)!), 0);
  await ctx.db.insert(coinDeposit).values({
    userId,
    source: "card_redeem",
    isPaid: false,
    amount: points,
    note: `${redeemed.length}枚をまとめて還元`,
  });
  return { count: redeemed.length, points };
}
