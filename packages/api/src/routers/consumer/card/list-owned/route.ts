import { rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardListOwnedInputSchema = z.object({
  genreId: z.string().optional(),
  rarity: z.enum(rarities).optional(),
});

export const cardListOwnedOutputSchema = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      imageUrl: z.string().nullable(),
      rarity: z.enum(rarities),
      genreName: z.string(),
      genreColorHex: z.string(),
      ownedCount: z.number(),
      listedCount: z.number(),
    }),
  ),
  // 各カードを1枚ずつ残して還元したときの枚数と pt
  duplicates: z.object({ count: z.number(), points: z.number() }),
});

export type CardListOwnedInput = z.infer<typeof cardListOwnedInputSchema>;
export type CardListOwnedOutput = z.infer<typeof cardListOwnedOutputSchema>;

export const cardListOwnedRoute = protectedProcedure
  .input(cardListOwnedInputSchema)
  .output(cardListOwnedOutputSchema)
  .query(handler);
