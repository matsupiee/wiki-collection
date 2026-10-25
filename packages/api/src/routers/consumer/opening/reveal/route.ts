import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const openingRevealInputSchema = z.object({ openingId: z.string() });

export const openingRevealOutputSchema = z.object({ revealedAt: z.string() });

export type OpeningRevealInput = z.infer<typeof openingRevealInputSchema>;
export type OpeningRevealOutput = z.infer<typeof openingRevealOutputSchema>;

// 開封演出を最後まで見た（開封結果に到達した）ことを記録する
export const openingRevealRoute = protectedProcedure
  .input(openingRevealInputSchema)
  .output(openingRevealOutputSchema)
  .mutation(handler);
