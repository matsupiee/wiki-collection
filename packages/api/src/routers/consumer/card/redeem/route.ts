import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const cardRedeemInputSchema = z.object({ userCardId: z.string() });

export const cardRedeemOutputSchema = z.object({ points: z.number() });

export type CardRedeemInput = z.infer<typeof cardRedeemInputSchema>;
export type CardRedeemOutput = z.infer<typeof cardRedeemOutputSchema>;

export const cardRedeemRoute = protectedProcedure
  .input(cardRedeemInputSchema)
  .output(cardRedeemOutputSchema)
  .mutation(handler);
