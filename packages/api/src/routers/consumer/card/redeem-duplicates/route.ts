import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardRedeemDuplicatesInputSchema = z.void();

export const cardRedeemDuplicatesOutputSchema = z.object({ count: z.number(), points: z.number() });

export type CardRedeemDuplicatesOutput = z.infer<typeof cardRedeemDuplicatesOutputSchema>;

// 各カードを1枚ずつ残して、残りの所持中のカードをまとめて還元する
export const cardRedeemDuplicatesRoute = protectedProcedure
  .input(cardRedeemDuplicatesInputSchema)
  .output(cardRedeemDuplicatesOutputSchema)
  .mutation(handler);
