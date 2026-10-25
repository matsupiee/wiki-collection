import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketBidInputSchema = z.object({
  listingId: z.string(),
  amount: z.number().int().min(1).max(10_000_000),
});

export const marketBidOutputSchema = z.object({ currentPrice: z.number() });

export type MarketBidInput = z.infer<typeof marketBidInputSchema>;
export type MarketBidOutput = z.infer<typeof marketBidOutputSchema>;

// オークションに入札する。入札額はその場で消費し、抜かれたら返す
export const marketBidRoute = protectedProcedure
  .input(marketBidInputSchema)
  .output(marketBidOutputSchema)
  .mutation(handler);
