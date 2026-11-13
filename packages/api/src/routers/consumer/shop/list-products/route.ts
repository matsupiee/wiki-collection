import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const shopListProductsInputSchema = z.void();

export const shopListProductsOutputSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      coins: z.number(),
    }),
  ),
  storeEnabled: z.boolean(),
  accountToken: z.string().uuid(),
  // 開発用の従来の購入フローを使えるか。
  purchasable: z.boolean(),
});

export type ShopListProductsOutput = z.infer<typeof shopListProductsOutputSchema>;

export const shopListProductsRoute = protectedProcedure
  .input(shopListProductsInputSchema)
  .output(shopListProductsOutputSchema)
  .query(handler);
