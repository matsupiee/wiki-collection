import { coinProduct } from "@wiki-collection/db/schema/index";
import { accountToken } from "../../../../shared/shop/app-store";
import { asc, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { ShopListProductsOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<ShopListProductsOutput> {
  const products = await ctx.db
    .select({
      id: coinProduct.id,
      sku: coinProduct.sku,
      name: coinProduct.name,
      coins: coinProduct.coins,
    })
    .from(coinProduct)
    .where(eq(coinProduct.isActive, true))
    .orderBy(asc(coinProduct.sortOrder));
  return {
    products,
    purchasable: ctx.localDevelopment === true,
    storeEnabled: true,
    accountToken: await accountToken(ctx.session.user.id),
  };
}
