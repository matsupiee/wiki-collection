import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
const slot = z.number().int().min(1).max(3);
const id = z.string().min(1);
export const battleSaveTeamInputSchema = z.object({
  slot,
  name: z.string().trim().min(1).max(30),
  members: z
    .array(id)
    .length(3)
    .refine((v) => new Set(v).size === 3, "異なる3枚を選んでください"),
});
export type battleSaveTeamInput = z.infer<typeof battleSaveTeamInputSchema>;
export const battleSaveTeamOutputSchema = z.object({
  id: z.string(),
  slot: z.number(),
  name: z.string(),
  member1: z.string(),
  member2: z.string(),
  member3: z.string(),
});
export const battleSaveTeamRoute = protectedProcedure
  .input(battleSaveTeamInputSchema)
  .output(battleSaveTeamOutputSchema)
  .mutation(handler);
