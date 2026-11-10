import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

const score = z.object({
  rank: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export const cardAssetRankingRoute = protectedProcedure
  .input(z.void())
  .output(
    z.object({
      mine: score.nullable(),
      leaders: z.array(score.extend({ name: z.string(), mine: z.boolean() })),
    }),
  )
  .query(handler);
