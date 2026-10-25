# カードを還元して pt を受け取る

> ステータス: 実装済み

## ストーリー

いらないカードや重複したカードを持っているユーザーとして、カードを手放して pt を受け取りたい。
受け取った pt でジャンルパックを開けたり、マーケットで欲しいカードを買ったりできる。

## 動作確認の手順

`bun run db:seed` を実行し、`bun run dev:local` で起動しておく。

1. `hanako@example.com` でログインし、コレクション画面を開く。
   - 下に「重複をまとめて還元（枚数・pt）」ボタンが出る。
2. 「重複をまとめて還元」を押す。
   - 確認ダイアログに、手放す枚数と受け取る pt が出る。
3. 「還元する」を押す。
   - 「◯枚を還元して ◯pt を受け取りました」と出る。
   - 各カードが1枚ずつ残り、ボタンが消える。
   - 出品中のカードがあるカードは、出品中の1枚を残す1枚とみなし、所持中のものはすべて還元される。
   - ヘッダーの残高が増える。
4. カード詳細画面を開き、「還元する ◯pt」を押す。
   - 確認ダイアログのあと、そのカードを1枚手放して pt を受け取る。
   - 還元 pt はレアリティで決まる（コモン 1pt、アンコモン 3pt、レア 15pt、ダブルレア 60pt、レジェンド 300pt）。
5. 所持中のカードが0枚のカード詳細画面を開く。
   - 「還元する」と「出品する」が押せない。

## データの持ち方

- `user_card.status`: 還元すると `redeemed` になる。行は消さない。
  - 出品中（`listed`）のカードは還元できない。
- `coin_deposit`: 還元で得た pt。`source = card_redeem`、`isPaid = false`（無償）。
  - まとめて還元したときは1件にまとめる。1pt の獲得が細かく大量にできると、消費のたびに割り当てが散らばるため。

## 対応するテスト

- `packages/api/src/routers/consumer/card/redeem/handler.integration.test.ts`
- `packages/api/src/routers/consumer/card/redeem-duplicates/handler.integration.test.ts`
- `packages/api/src/routers/consumer/card/list-owned/handler.integration.test.ts`
  - 重複の枚数と pt の計算
