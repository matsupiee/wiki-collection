import { coinProduct } from "@wiki-collection/db/schema/index";
import { asc, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { ShopListProductsOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<ShopListProductsOutput> {
  const products = await ctx.db
    .select({
      id: coinProduct.id,
      name: coinProduct.name,
      priceAmount: coinProduct.priceAmount,
      currency: coinProduct.currency,
      coins: coinProduct.coins,
    })
    .from(coinProduct)
    .where(eq(coinProduct.isActive, true))
    .orderBy(asc(coinProduct.sortOrder));
  return { products, purchasable: ctx.paymentMode === "mock" };
}
