import { coinDeposit, coinProduct, coinPurchase } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import { accountToken, verifyTransaction } from "../../../../shared/shop/app-store";
import type { ShopPurchaseInput, ShopPurchaseOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: ShopPurchaseInput;
  ctx: ProtectedContext;
}): Promise<ShopPurchaseOutput> {
  const userId = ctx.session.user.id;
  if ("productId" in input && !ctx.localDevelopment) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "現在 pt は購入できません" });
  }
  const tx =
    "receipt" in input ? await verifyTransaction(input.receipt, ctx.localDevelopment) : undefined;
  if (
    tx &&
    (!tx.transactionId ||
      !tx.productId ||
      tx.type !== "Consumable" ||
      tx.quantity !== 1 ||
      tx.revocationDate != null ||
      tx.appAccountToken?.toLowerCase() !== (await accountToken(userId)))
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "購入情報を確認できませんでした" });
  }

  // A product may be retired between payment and delivery.
  const [product] = await ctx.db
    .select()
    .from(coinProduct)
    .where(
      "productId" in input
        ? and(eq(coinProduct.id, input.productId), eq(coinProduct.isActive, true))
        : eq(coinProduct.sku, tx!.productId!),
    );
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "商品が見つかりません" });

  const provider = tx ? "app_store" : "mock";
  const paymentId = tx ? tx.environment + "/" + tx.transactionId : crypto.randomUUID();
  const purchaseId = crypto.randomUUID();
  let amount = null;
  let currency = null;
  if (tx?.price != null && tx.currency) {
    currency = tx.currency;
    const { maximumFractionDigits } = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions();
    // StoreKit reports prices in thousandths of a currency unit.
    amount = Math.round(tx.price * 10 ** ((maximumFractionDigits ?? 2) - 3));
  }
  try {
    await ctx.db.batch([
      ctx.db.insert(coinPurchase).values({
        id: purchaseId,
        userId,
        coinProductId: product.id,
        provider,
        providerPaymentId: paymentId,
        amount,
        currency,
        coins: product.coins,
        status: "completed",
        completedAt: new Date(),
      }),
      ctx.db.insert(coinDeposit).values({
        userId,
        source: "purchase",
        isPaid: true,
        amount: product.coins,
        coinPurchaseId: purchaseId,
      }),
    ]);
  } catch (error) {
    const [previous] = await ctx.db
      .select()
      .from(coinPurchase)
      .where(
        and(eq(coinPurchase.provider, provider), eq(coinPurchase.providerPaymentId, paymentId)),
      );
    if (
      previous?.userId === userId &&
      previous.coinProductId === product.id &&
      previous.status === "completed"
    )
      return { coins: previous.coins };
    throw error;
  }
  return { coins: product.coins };
}
