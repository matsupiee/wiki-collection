import { rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardListOwnedInputSchema = z.object({
  sort: z.enum(["acquired", "monthlyPageviews", "articleLength"]).optional(),
  genreId: z.string().optional(),
  rarity: z.enum(rarities).optional(),
});

export const cardListOwnedOutputSchema = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      monthlyPageviews: z.number(),
      articleLength: z.number().nullable(),
      imageUrl: z.string().nullable(),
      rarity: z.enum(rarities),
      genreName: z.string(),
      genreColorHex: z.string(),
      ownedCount: z.number(),
      listedCount: z.number(),
    }),
  ),
});

export type CardListOwnedInput = z.infer<typeof cardListOwnedInputSchema>;
export type CardListOwnedOutput = z.infer<typeof cardListOwnedOutputSchema>;

export const cardListOwnedRoute = protectedProcedure
  .input(cardListOwnedInputSchema)
  .output(cardListOwnedOutputSchema)
  .query(handler);
