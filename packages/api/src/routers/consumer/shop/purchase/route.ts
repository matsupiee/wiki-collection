import z from "zod";

import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const shopPurchaseInputSchema = z.object({ productId: z.string() });

export const shopPurchaseOutputSchema = z.object({ coins: z.number() });

export type ShopPurchaseInput = z.infer<typeof shopPurchaseInputSchema>;
export type ShopPurchaseOutput = z.infer<typeof shopPurchaseOutputSchema>;

// 決済サービスとの連携（Stripe Checkout と Webhook）は未実装。
// paymentMode が mock のローカル開発でだけ、支払いなしで購入を完了させる
export const shopPurchaseRoute = protectedProcedure
  .input(shopPurchaseInputSchema)
  .output(shopPurchaseOutputSchema)
  .mutation(handler);
