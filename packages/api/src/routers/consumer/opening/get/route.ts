import { rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const openingGetInputSchema = z.object({ openingId: z.string() });

export const openingGetOutputSchema = z.object({
  opening: z.object({
    id: z.string(),
    createdAt: z.string(),
    revealedAt: z.string().nullable(),
  }),
  pack: z.object({ id: z.string(), slug: z.string(), name: z.string(), colorHex: z.string() }),
  // めくる順（レアリティの低い順）
  cards: z.array(
    z.object({
      userCardId: z.string(),
      slot: z.number(),
      isNew: z.boolean(),
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
    }),
  ),
});

export type OpeningGetInput = z.infer<typeof openingGetInputSchema>;
export type OpeningGetOutput = z.infer<typeof openingGetOutputSchema>;

export const openingGetRoute = protectedProcedure
  .input(openingGetInputSchema)
  .output(openingGetOutputSchema)
  .query(handler);
