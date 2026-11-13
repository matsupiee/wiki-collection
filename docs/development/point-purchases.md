# iOSのポイント購入

## シミュレーターで確認する

1. リポジトリ直下で `bun packages/db/src/seed/point-products-cli.ts` を実行する。既存の商品と残高は維持する。
2. `bun run dev:local` と `bun run dev:native` を起動する。ローカルAPIはXcodeのテスト取引を受け付ける。
3. 初回はapps/nativeで `bunx expo prebuild --platform ios` を実行し、ios/WikiCollection.xcworkspaceをXcodeで開く。必要に応じてiosで `pod install` を実行する。
4. apps/native/Points.storekitをプロジェクトに参照として追加し、SchemeのRun → Options → StoreKit Configurationで選ぶ。シミュレーターで実行してログインする。
5. ポイント購入画面を開き、支払い前後の有償残高を確認する。StoreKitの確認ダイアログを無効にした自動テストセッションでは `maestro --device <UDID> test tests/ios/buy-points.yaml` を使える。

## 配信設定

App Store Connectでcom.matsupiee.wikicollectionに消耗型商品coins_500、coins_1000、coins_5000を作り、価格・販売地域・審査情報を設定する。D1の商品がない場合は本番DB接続設定のある環境で `bun packages/db/src/seed/point-products-cli.ts --production` を実行する。

## TestFlightとApp Storeの購入環境

TestFlightからインストールしたアプリのアプリ内購入には、StoreKitが自動的にSandboxを使う。[Apple公式の説明](https://developer.apple.com/jp/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/)

Wiki Collectionでは、TestFlight版とApp Store版の `EXPO_PUBLIC_API_URL` に同じWorkerのHTTPS URLを指定する。WorkerはSandboxとProductionの両方の取引について、Appleの署名、購入環境、対象アプリ、購入者を検証する。どちらの購入も同じD1に記録し、同じユーザーの有償pt残高に加算するため、配布先に応じてWorkerやD1の設定を切り替える必要はない。

TestFlightで1,000ptを購入したら、有償残高が1,000pt増え、アプリ再起動後も残ることを確認する。D1で取引を確認するときは、購入履歴の `provider_payment_id` の先頭で購入環境を識別できる。TestFlightは `Sandbox/`、App Storeは `Production/` となる。
