# pt を購入する

> ステータス: ローカル開発でだけ実装済み。決済サービス（Stripe など）との連携は未実装で、本番では購入できない。

## ストーリー

ジャンルパックを開けたい、マーケットでカードを買いたいユーザーとして、pt を購入したい。
10ドルで 1,000pt のように、分かりやすい単位で買える。

## 動作確認の手順

`bun run db:seed` を実行し、`bun run dev:local` で起動しておく。ローカルでは `PAYMENT_MODE=mock` なので、支払いなしで購入が完了する。

1. `taro@example.com` でログインし、ヘッダーの pt 残高を押してショップを開く。
   - 残高と、その内訳（有償・無償）が出る。
   - 500pt $5、1,000pt $10、5,000pt $50 の商品が出る。
   - 「開発環境のため、実際の支払いは行われません」と出る。
   - 払い戻しできないこと、無償 pt から先に使われることが書いてある。
   - 特定商取引法に基づく表記と、資金決済法に基づく表示へのリンクがある。
2. 「1,000pt」を押す。
   - 確認ダイアログが出る。
3. 「購入する」を押す。
   - 「1,000pt を購入しました」と出て、残高の有償 pt が 1,000 増える。
4. ヘッダーの残高を押す。
   - ショップに移動する。
5. 本番と同じ設定（`PAYMENT_MODE` を指定しない）で開く。
   - 「現在 pt は購入できません」と出て、商品を押せない。

## データの持ち方

- `coin_product`: 商品。価格は最小通貨単位（セント）で持つ。
- `coin_purchase`: 購入の記録。`(provider, providerPaymentId)` の unique 制約で、Webhook が二重に届いても二重に付与しない。
- `coin_deposit`: 購入した pt。`source = purchase`、`isPaid = true`（有償）。

## 対応するテスト

- `packages/api/src/routers/consumer/shop/list-products/handler.integration.test.ts`
- `packages/api/src/routers/consumer/shop/purchase/handler.integration.test.ts`
