import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const coinGetBalanceInputSchema = z.void();

export const coinGetBalanceOutputSchema = z.object({
  total: z.number(),
  paid: z.number(),
  free: z.number(),
});

export type CoinGetBalanceOutput = z.infer<typeof coinGetBalanceOutputSchema>;

export const coinGetBalanceRoute = protectedProcedure
  .input(coinGetBalanceInputSchema)
  .output(coinGetBalanceOutputSchema)
  .query(handler);
