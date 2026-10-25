import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketCancelListingInputSchema = z.object({ listingId: z.string() });

export const marketCancelListingOutputSchema = z.object({ cancelled: z.literal(true) });

export type MarketCancelListingInput = z.infer<typeof marketCancelListingInputSchema>;
export type MarketCancelListingOutput = z.infer<typeof marketCancelListingOutputSchema>;

// 出品を取り下げる。入札が入ったオークションは取り下げられない
export const marketCancelListingRoute = protectedProcedure
  .input(marketCancelListingInputSchema)
  .output(marketCancelListingOutputSchema)
  .mutation(handler);
