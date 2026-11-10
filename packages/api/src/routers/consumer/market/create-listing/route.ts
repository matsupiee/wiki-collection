import { auctionDurationHours } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

const MAX_PRICE = 1_000_000;

export const marketCreateListingInputSchema = z.object({
  format: z.literal("auction"),
  userCardId: z.string(),
  startPrice: z.number().int().min(1).max(MAX_PRICE),
  durationHours: z.literal(auctionDurationHours),
});

export const marketCreateListingOutputSchema = z.object({ listingId: z.string() });

export type MarketCreateListingInput = z.infer<typeof marketCreateListingInputSchema>;
export type MarketCreateListingOutput = z.infer<typeof marketCreateListingOutputSchema>;

export const marketCreateListingRoute = protectedProcedure
  .input(marketCreateListingInputSchema)
  .output(marketCreateListingOutputSchema)
  .mutation(handler);
