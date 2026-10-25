import { coinDeposit, coinProduct, coinPurchase } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { ShopPurchaseInput, ShopPurchaseOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: ShopPurchaseInput;
  ctx: ProtectedContext;
}): Promise<ShopPurchaseOutput> {
  if (ctx.paymentMode !== "mock") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "現在 pt は購入できません" });
  }
  const userId = ctx.session.user.id;
  const [product] = await ctx.db
    .select()
    .from(coinProduct)
    .where(and(eq(coinProduct.id, input.productId), eq(coinProduct.isActive, true)));
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "商品が見つかりません" });

  const now = new Date();
  const [purchase] = await ctx.db
    .insert(coinPurchase)
    .values({
      userId,
      coinProductId: product.id,
      provider: "mock",
      providerPaymentId: `mock_${crypto.randomUUID()}`,
      amount: product.priceAmount,
      currency: product.currency,
      coins: product.coins,
      status: "completed",
      completedAt: now,
    })
    .returning({ id: coinPurchase.id });
  await ctx.db.insert(coinDeposit).values({
    userId,
    source: "purchase",
    isPaid: true,
    amount: product.coins,
    coinPurchaseId: purchase!.id,
  });
  return { coins: product.coins };
}
