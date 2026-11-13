# pt を購入する

> ステータス: iOSのApp Store決済を実装。ストアへの商品登録とアプリの配信は別途必要。

## ストーリー

確定ガチャを開けたり、マーケットで入札したりするために、有償ptを購入したい。

## 動作確認の手順

1. [StoreKitの開発手順](../development/point-purchases.md)に従い、ログインしてヘッダーの残高を押す。
   - 「ポイント購入」に有償・無償の残高と500pt、1,000pt、5,000ptのストア価格が出る。
   - 特定商取引法と資金決済法の表示を開ける。
2. 商品を選び「購入する」を押して、App Storeの確認画面でキャンセルする。
   - 残高は変わらず、再度購入できる。
3. 1,000ptを選んで支払いを完了する。
   - 完了メッセージが出て、有償残高だけが1,000pt増える。TestFlightで得たptも、App Store版で同じユーザーとしてログインすると使える。
4. 購入直後の通信切断を解除し、アプリを開き直す。
   - 同じ利用者で未反映の購入が再処理され、同一取引での付与は1回だけになる。

## データの持ち方

- coin_product.skuとApp Storeの商品IDを対応させる。
- 表示価格はStoreKitから取得する。購入履歴にはApp Storeの取引で金額と通貨を両方取得できた場合に記録し、片方でも欠ける場合や模擬購入では両方をNULLにする。
- coin_purchaseと有償のcoin_depositを同じバッチで作る。購入元と取引IDの組み合わせは一意とする。

## 対応するテスト

- packages/api/src/routers/consumer/shop/list-products/handler.integration.test.ts
- packages/api/src/routers/consumer/shop/purchase/handler.integration.test.ts
- packages/api/src/shared/shop/app-store.test.ts
- tests/ios/buy-points.yaml
