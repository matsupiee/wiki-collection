import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
export const battleTeamsOutputSchema = z.array(
  z.object({
    id: z.string(),
    slot: z.number(),
    name: z.string(),
    member1: z.string(),
    member2: z.string(),
    member3: z.string(),
  }),
);
export const battleTeamsRoute = protectedProcedure.output(battleTeamsOutputSchema).query(handler);
