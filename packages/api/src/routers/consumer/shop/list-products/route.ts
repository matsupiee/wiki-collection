import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const shopListProductsInputSchema = z.void();

export const shopListProductsOutputSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      priceAmount: z.number(),
      currency: z.string(),
      coins: z.number(),
    }),
  ),
  // false のときは購入ボタンを押せない（決済の準備ができていない）
  purchasable: z.boolean(),
});

export type ShopListProductsOutput = z.infer<typeof shopListProductsOutputSchema>;

export const shopListProductsRoute = protectedProcedure
  .input(shopListProductsInputSchema)
  .output(shopListProductsOutputSchema)
  .query(handler);
