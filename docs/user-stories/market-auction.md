# オークションでカードを売り買いする

> ステータス: 実装済み（終了したオークションは画面を開いたときに締める。Cron での定期実行は未実装）

## ストーリー

レアなカードを持っているユーザーとして、オークションに出して、いちばん高く買いたい人に売りたい。
買う側は、入札で競り合って欲しいカードを手に入れられる。

## 動作確認の手順

`bun run db:seed` を実行し、`bun run dev:local` で起動しておく。seed では次のオークションがある。

- 徳川家康: 出品者 hanako、開始 50pt、jiro が 50pt で入札中、残り2日
- 富士山: 出品者 hanako、jiro が 60pt で入札したまま1時間前に終了

1. `hanako@example.com` でログインし、マーケットのオークションタブを開く。
   - 終了済みの富士山のオークションが締められ、一覧から消える。
   - 「出品・入札の管理」で富士山が「取引成立 60pt」になり、「pt の履歴」に「マーケットの売上 +54pt」が入る。
2. カード詳細画面から「出品する」を押し、オークション、開始価格 120pt、期間3日で出品する。
   - 出品詳細画面に「開始価格 120pt」「残り 2日23時間」が出る。
   - 入札がない間は「出品を取り下げる」を押せる。
3. `taro@example.com` でログインし、ショップで 1,000pt を購入してから、徳川家康のオークションを開く。
   - 入札額の欄の最低額は、現在価格 50pt の 5% 上（53pt）。
4. 最低額で入札する。
   - 確認ダイアログで「入札額はすぐに残高から支払われ、ほかの人に抜かれたら戻ります」と出る。
   - 入札履歴の先頭に taro の入札が出て、「あなたが最高額です」と出る。入札欄は消える。
   - taro の残高が入札額だけ減る。
5. `jiro@example.com` でログインし、「pt の履歴」を開く。
   - 抜かれた 50pt が「入札の返金」として戻っている。
6. jiro が「出品・入札の管理」を開く。
   - 富士山が「買ったもの」に入っている。
7. 入札が入ったオークションを、出品者が開く。
   - 「入札があるため取り下げられません」と出て押せない。

## データの持ち方

- `market_listing`: `format = auction`。`startPrice`、`currentPrice`、`bidCount`、`endsAt`。
- `auction_bid`: 入札ごとに1行。`sequence` は出品ごとの通し番号で、同時の入札は unique 制約で1件だけ通す。
  - `status`: `leading`（最高額）、`outbid`（抜かれた）、`won`（落札）。
- 入札額はその場で `coin_withdraw`（`auction_bid`）として消費する。抜かれたら、払ったときと同じ有償・無償の内訳で `coin_deposit`（`bid_refund`）を作って返す。
- 終了したオークションの締め: 入札があれば `sold` にしてカードを落札者に移し、出品者に売上（手数料 10% を引いた無償 pt）を入れる。入札がなければ `expired` にしてカードを出品者に戻す。

## 対応するテスト

- `packages/api/src/routers/consumer/market/bid/handler.integration.test.ts`
  - 返金の内訳、最低額、入札できない条件、同時入札
- `packages/api/src/routers/consumer/market/list/handler.integration.test.ts`
  - 終了したオークションの締めと、二重に締めないこと
- `packages/api/src/routers/consumer/market/get/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/list-mine/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/cancel-listing/handler.integration.test.ts`
