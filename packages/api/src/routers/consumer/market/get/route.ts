import { listingFormats, listingStatuses, rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketGetInputSchema = z.object({ listingId: z.string() });

export const marketGetOutputSchema = z.object({
  listing: z.object({
    id: z.string(),
    format: z.enum(listingFormats),
    status: z.enum(listingStatuses),
    price: z.number().nullable(),
    startPrice: z.number().nullable(),
    currentPrice: z.number().nullable(),
    bidCount: z.number(),
    endsAt: z.string().nullable(),
    soldPrice: z.number().nullable(),
    sellerName: z.string(),
    isMine: z.boolean(),
    isBuyer: z.boolean(),
  }),
  card: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    imageUrl: z.string().nullable(),
    rarity: z.enum(rarities),
    monthlyPageviews: z.number(),
    genreName: z.string(),
    genreColorHex: z.string(),
  }),
  bids: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      bidderName: z.string(),
      isMine: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  minNextBid: z.number().nullable(),
  isLeading: z.boolean(),
  balance: z.number(),
});

export type MarketGetInput = z.infer<typeof marketGetInputSchema>;
export type MarketGetOutput = z.infer<typeof marketGetOutputSchema>;

export const marketGetRoute = protectedProcedure
  .input(marketGetInputSchema)
  .output(marketGetOutputSchema)
  .query(handler);
