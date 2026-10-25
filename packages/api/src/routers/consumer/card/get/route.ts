import { rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardGetInputSchema = z.object({ cardId: z.string() });

export const cardGetOutputSchema = z.object({
  card: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    imageUrl: z.string().nullable(),
    imageCredit: z.string().nullable(),
    rarity: z.enum(rarities),
    monthlyPageviews: z.number(),
    wikiUrl: z.string(),
    // 取り込んだ時点の版。seed のサンプルカードは null
    wikiRevisionUrl: z.string().nullable(),
    genreName: z.string(),
    genreColorHex: z.string(),
  }),
  discovered: z.boolean(),
  ownedUserCardIds: z.array(z.string()),
  listedCount: z.number(),
  redeemPoints: z.number(),
  lowestMarketPrice: z.number().nullable(),
});

export type CardGetInput = z.infer<typeof cardGetInputSchema>;
export type CardGetOutput = z.infer<typeof cardGetOutputSchema>;

export const cardGetRoute = protectedProcedure
  .input(cardGetInputSchema)
  .output(cardGetOutputSchema)
  .query(handler);
