import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketBuyInputSchema = z.object({ listingId: z.string() });

export const marketBuyOutputSchema = z.object({ cardId: z.string(), price: z.number() });

export type MarketBuyInput = z.infer<typeof marketBuyInputSchema>;
export type MarketBuyOutput = z.infer<typeof marketBuyOutputSchema>;

// フリマ形式の出品を購入する
export const marketBuyRoute = protectedProcedure
  .input(marketBuyInputSchema)
  .output(marketBuyOutputSchema)
  .mutation(handler);
