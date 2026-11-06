import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
const id = z.string().min(1);
export const battleFuseInputSchema = z
  .object({ baseId: id, materialId: id })
  .refine((v) => v.baseId !== v.materialId, "同じカードは合成できません");
export type battleFuseInput = z.infer<typeof battleFuseInputSchema>;
export const battleFuseOutputSchema = z.object({
  coefficient: z.number(),
  attackGain: z.number(),
  defenseGain: z.number(),
});
export const battleFuseRoute = protectedProcedure
  .input(battleFuseInputSchema)
  .output(battleFuseOutputSchema)
  .mutation(handler);
