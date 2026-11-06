import { elements } from "@wiki-collection/db/battle";
import z from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";
export const battleInventoryOutputSchema = z.array(
  z.object({
    id: z.string(),
    cardId: z.string(),
    title: z.string(),
    imageUrl: z.string().nullable(),
    attack: z.number(),
    defense: z.number().nullable(),
    baseAttack: z.number(),
    baseDefense: z.number().nullable(),
    attackBonus: z.number(),
    defenseBonus: z.number(),
    element: z.enum(elements),
    inTeam: z.boolean(),
  }),
);
export const battleInventoryRoute = protectedProcedure
  .output(battleInventoryOutputSchema)
  .query(handler);
