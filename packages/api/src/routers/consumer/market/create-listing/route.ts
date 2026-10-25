import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

const MAX_PRICE = 1_000_000;

export const marketCreateListingInputSchema = z.discriminatedUnion("format", [
  z.object({
    format: z.literal("fixed_price"),
    userCardId: z.string(),
    price: z.number().int().min(1).max(MAX_PRICE),
  }),
  z.object({
    format: z.literal("auction"),
    userCardId: z.string(),
    startPrice: z.number().int().min(1).max(MAX_PRICE),
    durationHours: z.union([z.literal(24), z.literal(72), z.literal(168)]),
  }),
]);

export const marketCreateListingOutputSchema = z.object({ listingId: z.string() });

export type MarketCreateListingInput = z.infer<typeof marketCreateListingInputSchema>;
export type MarketCreateListingOutput = z.infer<typeof marketCreateListingOutputSchema>;

export const marketCreateListingRoute = protectedProcedure
  .input(marketCreateListingInputSchema)
  .output(marketCreateListingOutputSchema)
  .mutation(handler);
