import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const packOpenInputSchema = z.object({ packId: z.string() });

export const packOpenOutputSchema = z.object({
  openingId: z.string(),
  newUserCardIds: z.array(z.string()),
});

export type PackOpenInput = z.infer<typeof packOpenInputSchema>;
export type PackOpenOutput = z.infer<typeof packOpenOutputSchema>;

export const packOpenRoute = protectedProcedure
  .input(packOpenInputSchema)
  .output(packOpenOutputSchema)
  .mutation(handler);
