import z from "zod";
import { MAX_FUSION_MATERIALS } from "@wiki-collection/db/battle";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
const id = z.string().min(1);
export const battleFuseInputSchema = z
  .union([
    z.object({ baseId: id, materialIds: z.array(id).min(1).max(MAX_FUSION_MATERIALS) }).strict(),
    // 既存クライアントの1枚指定も同じ一括処理へ渡す。
    z
      .object({ baseId: id, materialId: id })
      .strict()
      .transform((v) => ({ baseId: v.baseId, materialIds: [v.materialId] })),
  ])
  .refine((v) => !v.materialIds.includes(v.baseId), "強化するカードは素材にできません")
  .refine((v) => new Set(v.materialIds).size === v.materialIds.length, "素材が重複しています");
export type battleFuseInput = z.output<typeof battleFuseInputSchema>;
export const battleFuseOutputSchema = z.object({
  coefficient: z.number().optional(),
  materialCount: z.number().int(),
  attackGain: z.number(),
  defenseGain: z.number(),
});
export const battleFuseRoute = protectedProcedure
  .input(battleFuseInputSchema)
  .output(battleFuseOutputSchema)
  .mutation(handler);
