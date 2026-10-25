import { rarities } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardListDexInputSchema = z.object({ genreId: z.string().optional() });

export const cardListDexOutputSchema = z.object({
  genres: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      colorHex: z.string(),
      total: z.number(),
      discovered: z.number(),
    }),
  ),
  cards: z.array(
    z.object({
      id: z.string(),
      // 手に入れたことのないカードはタイトルと画像を返さない（シルエットで表示する）
      title: z.string().nullable(),
      imageUrl: z.string().nullable(),
      rarity: z.enum(rarities),
      genreId: z.string(),
      discovered: z.boolean(),
    }),
  ),
});

export type CardListDexInput = z.infer<typeof cardListDexInputSchema>;
export type CardListDexOutput = z.infer<typeof cardListDexOutputSchema>;

export const cardListDexRoute = protectedProcedure
  .input(cardListDexInputSchema)
  .output(cardListDexOutputSchema)
  .query(handler);
