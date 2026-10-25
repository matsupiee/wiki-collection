import { listingFormats, rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const marketListInputSchema = z.object({
  format: z.enum(listingFormats),
  query: z.string().max(100).optional(),
  cardId: z.string().optional(),
  rarity: z.enum(rarities).optional(),
  sort: z.enum(["newest", "price_asc", "ending_soon", "most_bids"]).default("newest"),
});

export const marketListOutputSchema = z.object({
  listings: z.array(
    z.object({
      id: z.string(),
      format: z.enum(listingFormats),
      price: z.number(),
      bidCount: z.number(),
      endsAt: z.string().nullable(),
      isMine: z.boolean(),
      sellerName: z.string(),
      card: z.object({
        id: z.string(),
        title: z.string(),
        imageUrl: z.string().nullable(),
        rarity: z.enum(rarities),
        genreName: z.string(),
        genreColorHex: z.string(),
      }),
    }),
  ),
});

export type MarketListInput = z.input<typeof marketListInputSchema>;
export type MarketListOutput = z.infer<typeof marketListOutputSchema>;

export const marketListRoute = protectedProcedure
  .input(marketListInputSchema)
  .output(marketListOutputSchema)
  .query(handler);
