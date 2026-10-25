import { listingFormats, listingStatuses, rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketListMineInputSchema = z.void();

const listingSummarySchema = z.object({
  id: z.string(),
  format: z.enum(listingFormats),
  status: z.enum(listingStatuses),
  price: z.number(),
  bidCount: z.number(),
  endsAt: z.string().nullable(),
  card: z.object({ id: z.string(), title: z.string(), rarity: z.enum(rarities) }),
});

export const marketListMineOutputSchema = z.object({
  selling: z.array(listingSummarySchema),
  bidding: z.array(listingSummarySchema.extend({ myBid: z.number(), isLeading: z.boolean() })),
  bought: z.array(listingSummarySchema),
});

export type MarketListMineOutput = z.infer<typeof marketListMineOutputSchema>;

export const marketListMineRoute = protectedProcedure
  .input(marketListMineInputSchema)
  .output(marketListMineOutputSchema)
  .query(handler);
