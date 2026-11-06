import { historicalElements } from "@wiki-collection/db/battle";
import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
export const battleRankingInputSchema = z.object({ date: z.iso.date().optional() });
export type battleRankingInput = z.infer<typeof battleRankingInputSchema>;
export const battleRankingOutputSchema = z
  .object({
    date: z.string(),
    ranking: z.array(
      z.object({
        id: z.string(),
        userId: z.string(),
        player: z.string(),
        name: z.string(),
        rank: z.number(),
        points: z.number(),
        wins: z.number(),
        losses: z.number(),
        draws: z.number(),
        members: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            attack: z.number(),
            defense: z.number(),
            element: z.enum(historicalElements),
          }),
        ),
      }),
    ),
  })
  .nullable();
export const battleRankingRoute = protectedProcedure
  .input(battleRankingInputSchema)
  .output(battleRankingOutputSchema)
  .query(handler);
