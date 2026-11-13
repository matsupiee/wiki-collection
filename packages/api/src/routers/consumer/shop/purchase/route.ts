import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const shopPurchaseInputSchema = z.union([
  z.object({ receipt: z.string().min(1).max(32768) }),
  z.object({ productId: z.string() }),
]);

export const shopPurchaseOutputSchema = z.object({ coins: z.number() });

export type ShopPurchaseInput = z.infer<typeof shopPurchaseInputSchema>;
export type ShopPurchaseOutput = z.infer<typeof shopPurchaseOutputSchema>;

export const shopPurchaseRoute = protectedProcedure
  .input(shopPurchaseInputSchema)
  .output(shopPurchaseOutputSchema)
  .mutation(handler);
