import { packTypes, rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const packGetInputSchema = z.object({ slug: z.string() });

export const packGetOutputSchema = z.object({
  pack: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(packTypes),
    priceCoins: z.number().nullable(),
    colorHex: z.string(),
    cardsPerPack: z.number(),
    genreName: z.string().nullable(),
  }),
  // 枠ごとのレアリティの排出率（%）。画面で排出率を公開するために使う
  slotRates: z.array(
    z.object({
      slot: z.number(),
      rates: z.array(z.object({ rarity: z.enum(rarities), percent: z.number() })),
    }),
  ),
  canOpen: z.boolean(),
  // 開封できないときの理由
  blockedReason: z.enum(["no_free_pack", "insufficient_coins"]).nullable(),
  freePack: z.object({
    remaining: z.number(),
    limit: z.number(),
    nextRefillAt: z.string().nullable(),
  }),
  balance: z.number(),
});

export type PackGetInput = z.infer<typeof packGetInputSchema>;
export type PackGetOutput = z.infer<typeof packGetOutputSchema>;

export const packGetRoute = protectedProcedure
  .input(packGetInputSchema)
  .output(packGetOutputSchema)
  .query(handler);
