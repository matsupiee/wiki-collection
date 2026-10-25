import { packTypes } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const packListInputSchema = z.void();

export const packListOutputSchema = z.object({
  packs: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      description: z.string(),
      type: z.enum(packTypes),
      priceCoins: z.number().nullable(),
      colorHex: z.string(),
      genreName: z.string().nullable(),
    }),
  ),
  freePack: z.object({
    remaining: z.number(),
    initialRemaining: z.number(),
    dailyRemaining: z.number(),
    dailyLimit: z.number(),
    dailyResetsAt: z.string(),
  }),
});

export type PackListOutput = z.infer<typeof packListOutputSchema>;

export const packListRoute = protectedProcedure
  .input(packListInputSchema)
  .output(packListOutputSchema)
  .query(handler);
