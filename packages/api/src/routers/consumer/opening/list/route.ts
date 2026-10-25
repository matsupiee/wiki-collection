import { packPayments, rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const openingListInputSchema = z.void();

export const openingListOutputSchema = z.object({
  openings: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      revealed: z.boolean(),
      payment: z.enum(packPayments),
      coinsSpent: z.number(),
      packName: z.string(),
      cards: z.array(
        z.object({
          cardId: z.string(),
          title: z.string(),
          rarity: z.enum(rarities),
          isNew: z.boolean(),
        }),
      ),
    }),
  ),
});

export type OpeningListOutput = z.infer<typeof openingListOutputSchema>;

export const openingListRoute = protectedProcedure
  .input(openingListInputSchema)
  .output(openingListOutputSchema)
  .query(handler);
