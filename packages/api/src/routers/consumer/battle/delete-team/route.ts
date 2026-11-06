import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
const slot = z.number().int().min(1).max(3);
export const battleDeleteTeamInputSchema = z.object({ slot });
export type battleDeleteTeamInput = z.infer<typeof battleDeleteTeamInputSchema>;
export const battleDeleteTeamOutputSchema = z.object({ success: z.boolean() });
export const battleDeleteTeamRoute = protectedProcedure
  .input(battleDeleteTeamInputSchema)
  .output(battleDeleteTeamOutputSchema)
  .mutation(handler);
