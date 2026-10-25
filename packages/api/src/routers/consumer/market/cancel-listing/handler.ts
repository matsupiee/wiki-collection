import { marketListing, userCard } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { MarketCancelListingInput, MarketCancelListingOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: MarketCancelListingInput;
  ctx: ProtectedContext;
}): Promise<MarketCancelListingOutput> {
  const [cancelled] = await ctx.db
    .update(marketListing)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(marketListing.id, input.listingId),
        eq(marketListing.sellerId, ctx.session.user.id),
        eq(marketListing.status, "active"),
        eq(marketListing.bidCount, 0),
      ),
    )
    .returning({ userCardId: marketListing.userCardId });
  if (!cancelled) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "この出品は取り下げられません" });
  }
  await ctx.db
    .update(userCard)
    .set({ status: "owned" })
    .where(eq(userCard.id, cancelled.userCardId));
  return { cancelled: true };
}
