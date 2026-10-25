import { coinDepositSources, coinWithdrawPurposes } from "@wiki-collection/db/enums";
import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const coinListHistoryInputSchema = z.void();

export const coinListHistoryOutputSchema = z.object({
  entries: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("deposit"),
        id: z.string(),
        createdAt: z.string(),
        source: z.enum(coinDepositSources),
        isPaid: z.boolean(),
        amount: z.number(),
      }),
      z.object({
        kind: z.literal("withdraw"),
        id: z.string(),
        createdAt: z.string(),
        purpose: z.enum(coinWithdrawPurposes),
        amount: z.number(),
        // 有償・無償のどちらからいくら払ったか
        paidAmount: z.number(),
        freeAmount: z.number(),
      }),
    ]),
  ),
});

export type CoinListHistoryOutput = z.infer<typeof coinListHistoryOutputSchema>;

export const coinListHistoryRoute = protectedProcedure
  .input(coinListHistoryInputSchema)
  .output(coinListHistoryOutputSchema)
  .query(handler);
