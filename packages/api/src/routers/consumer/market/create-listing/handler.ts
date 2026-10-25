import { marketListing, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { MarketCreateListingInput, MarketCreateListingOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketCreateListingInput;
  ctx: ProtectedContext;
}): Promise<MarketCreateListingOutput> {
  const userId = ctx.session.user.id;
  // 所持中のカードだけを出品中にする。二重出品や他人のカードの出品はここで弾かれる
  const [listed] = await ctx.db
    .update(userCard)
    .set({ status: "listed" })
    .where(
      and(
        eq(userCard.id, input.userCardId),
        eq(userCard.userId, userId),
        eq(userCard.status, "owned"),
      ),
    )
    .returning({ id: userCard.id, cardId: userCard.cardId });
  if (!listed)
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "このカードは出品できません" });

  try {
    const [created] = await ctx.db
      .insert(marketListing)
      .values(
        input.format === "fixed_price"
          ? {
              sellerId: userId,
              userCardId: listed.id,
              cardId: listed.cardId,
              format: "fixed_price",
              price: input.price,
            }
          : {
              sellerId: userId,
              userCardId: listed.id,
              cardId: listed.cardId,
              format: "auction",
              startPrice: input.startPrice,
              endsAt: new Date(Date.now() + input.durationHours * 60 * 60 * 1000),
            },
      )
      .returning({ id: marketListing.id });
    return { listingId: created!.id };
  } catch (error) {
    await ctx.db.update(userCard).set({ status: "owned" }).where(eq(userCard.id, listed.id));
    throw error;
  }
}
