import { card, coinDeposit, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { getRedeemPoints } from "../../../../shared/card/get-redeem-points";
import type { CardRedeemInput, CardRedeemOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: CardRedeemInput;
  ctx: ProtectedContext;
}): Promise<CardRedeemOutput> {
  const userId = ctx.session.user.id;
  // 所持中のカードだけを還元済みにする。出品中や還元済みのカード、他人のカードは更新されない
  const [redeemed] = await ctx.db
    .update(userCard)
    .set({ status: "redeemed", redeemedAt: new Date() })
    .where(
      and(
        eq(userCard.id, input.userCardId),
        eq(userCard.userId, userId),
        eq(userCard.status, "owned"),
      ),
    )
    .returning({ id: userCard.id, cardId: userCard.cardId });
  if (!redeemed) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "このカードは還元できません" });
  }

  const [found] = await ctx.db
    .select({ rarity: card.rarity })
    .from(card)
    .where(eq(card.id, redeemed.cardId));
  const points = getRedeemPoints(found!.rarity);
  try {
    await ctx.db.insert(coinDeposit).values({
      userId,
      source: "card_redeem",
      isPaid: false,
      amount: points,
      userCardId: redeemed.id,
    });
  } catch (error) {
    await ctx.db
      .update(userCard)
      .set({ status: "owned", redeemedAt: null })
      .where(eq(userCard.id, redeemed.id));
    throw error;
  }
  return { points };
}
