# オークションでカードを売り買いする

> ステータス: 実装済み（終了したオークションは画面を開いたときに締める。Cron での定期実行は未実装）

## ストーリー

レアなカードを持っているユーザーとして、オークションに出して、いちばん高く買いたい人に売りたい。
買う側は、入札で競り合って欲しいカードを手に入れられる。

## 動作確認の手順

`bun packages/db/src/seed/index.ts` を実行し、`bun run dev:local` で起動しておく。seed では次のオークションがある。

- 徳川家康: 出品者 hanako、開始 50pt、jiro が 50pt で入札中、残り2日
- 折り紙、信濃川、将棋: それぞれ100pt、200pt、300ptで出品中。徳川家康と合わせて、1行目に3件、2行目に1件表示される。
- 富士山: 出品者 hanako、jiro が 60pt で入札したまま1時間前に終了

1. `hanako@example.com` でログインし、マーケットを開く。
   - オークション一覧が直接表示され、終了が近い順、入札が多い順、安い順で並べ替えられる。
   - 一覧は3列で、各出品には写真、名前、残り時間、現在価格だけが表示される。出品を押すと詳細が開く。
   - 終了済みの富士山のオークションが締められ、一覧から消える。
   - 「出品・入札の管理」で富士山が「取引成立 60pt」になり、「pt の履歴」に「マーケットの売上 +54pt」が入る。
2. カード詳細画面から「出品する」を押し、開始価格 120pt、期間3日で出品する。
   - 開始価格は9ptでは出品できず、10ptから出品できる。
   - 出品詳細画面に「開始価格 120pt」「残り 2日23時間」が出る。
   - 1時間・12時間・1日・3日・7日から期間を選べる。1時間または12時間で出品すると、詳細画面の残り時間が選んだ期間に対応する。
   - 入札がない間は「出品を取り下げる」を押せる。
3. `taro@example.com` でログインし、残高0ptで徳川家康のオークションを開く。
   - 入札額の欄の最低額は、現在価格50ptに10ptを足した60pt。59ptでは入札できない。
   - 60ptを入力して「入札」を押すと、不足分の60ptと「pt を購入」が表示される。「やめる」で入力額を保持したまま戻れる。
   - 再度「入札」を押し、「pt を購入」から1,000ptを購入する。マーケットタブに戻ると入札額を確認でき、入札履歴は増えていない。
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

- `tests/ios/market-bid-shortfall.yaml` と `tests/native/app.spec.ts`
  - 残高不足時の購入案内、入力額の保持、購入後の再入札
- `tests/ios/market-grid.yaml`
  - 一覧の2行目の出品と、出品詳細への移動

- `packages/api/src/routers/consumer/market/bid/handler.integration.test.ts`
  - 返金の内訳、最低額、入札できない条件、同時入札
- `packages/api/src/routers/consumer/market/list/handler.integration.test.ts`
  - 終了したオークションの締めと、二重に締めないこと
- `packages/api/src/routers/consumer/market/get/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/list-mine/handler.integration.test.ts`
- `packages/api/src/routers/consumer/market/cancel-listing/handler.integration.test.ts`
