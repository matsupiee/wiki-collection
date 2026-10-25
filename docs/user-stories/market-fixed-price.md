# フリマでカードを売り買いする

> ステータス: 実装済み

## ストーリー

欲しいカードがあるユーザーとして、ほかのユーザーが決めた価格でそのカードをすぐに買いたい。
売る側は、還元するよりも高い pt で手放せる。

## 動作確認の手順

`bun run db:seed` を実行し、`bun run dev:local` で起動しておく。seed では hanako がブラックホールを 90pt で出品している。

1. `jiro@example.com` でログインし、マーケットのフリマタブを開く。
   - ブラックホール 90pt の出品が、出品者「はなこ」と一緒に出る。
   - 「安い順」で並べ替えられる。カード名で検索できる。
2. ブラックホールの出品を開き、「購入する」を押す。
   - 確認ダイアログに、支払う pt と購入後の残高が出る。
3. 「購入する」を押す。
   - 「購入しました」と出て、出品が「あなたが購入しました」になる。
   - jiro の残高が 90pt 減り、コレクションにブラックホールが入る。
4. `hanako@example.com` でログインし、「pt の履歴」を開く。
   - 「マーケットの売上 +81pt（無償）」が入っている。手数料 10% が引かれる。
5. hanako がカード詳細画面から「出品する」を押し、フリマで価格を入れる。
   - 手数料と受け取り額が入力に合わせて出る。
   - 出品すると、コレクションのそのカードに「出品中1」と出る。
6. 出品詳細画面で「出品を取り下げる」を押す。
   - カードは所持中に戻る。
7. 自分の出品を開く。
   - 購入ボタンは出ず、取り下げボタンだけが出る。
8. 残高が足りない出品を開く。
   - ボタンが「pt を購入する」になる。

## データの持ち方

- `market_listing`: `format = fixed_price`、`price` が価格。売れたら `status = sold`、`buyerId`、`soldPrice`、`feeAmount` を入れる。
  - `status = 'active'` の部分 unique index で、同じカードの二重出品を防ぐ。
- `user_card`: 出品中は `status = listed`。売れたら `userId` を買い手に書き換えて `owned` に戻す。
- `coin_withdraw`（買い手、`market_buy`）と `coin_deposit`（出品者、`market_sale`、無償）。

## 対応するテスト

- `packages/api/src/routers/consumer/market/buy/handler.integration.test.ts`
  - 売上と手数料、カードの移動、残高不足、自分の出品、同時購入
- `packages/api/src/routers/consumer/market/create-listing/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/cancel-listing/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/list/handler.integration.test.ts`
