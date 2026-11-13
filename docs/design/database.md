# DB 設計

> ステータス: 実装済み。スキーマは `packages/db/src/schema/`、マイグレーションは `packages/db/src/migrations/`。

[requirement.md](../requirement.md) の要件を Cloudflare D1（SQLite）と Drizzle ORM で実現するためのテーブル設計。
[database-pattern.md](../rules/database-pattern.md) に従い、どのテーブルも先頭に `id`・`createdAt`・`updatedAt` を置き、1テーブル1ファイルで定義する。
下の表では、この3列と、better-auth が管理する `user` などのテーブルは省略する。

## 全体像

```mermaid
erDiagram
  user ||--o| free_pack_allowance : "無料枠"
  user ||--o{ coin_deposit : "pt の獲得"
  user ||--o{ coin_withdraw : "pt の消費"
  user ||--o{ coin_purchase : "課金"
  user ||--o{ pack_opening : "開封"
  user ||--o{ user_card : "所持"
  user ||--o{ card_discovery : "初獲得の記録"
  user ||--o{ market_listing : "出品"
  user ||--o{ notification_user : "通知の配信先"
  notification ||--o{ notification_user : "通知の内容"
  user ||--o{ auction_bid : "入札"

  coin_deposit ||--o{ coin_deposit_withdraw : ""
  coin_withdraw ||--o{ coin_deposit_withdraw : ""

  genre ||--o{ card : ""
  genre ||--o{ pack : "ジャンルパック"
  card ||--o{ user_card : ""
  card ||--o{ card_discovery : ""

  pack ||--o{ pack_slot_rate : "排出率"
  pack ||--o{ pack_opening : ""
  pack_opening ||--o{ user_card : "5枚"

  user_card ||--o{ market_listing : ""
  market_listing ||--o{ auction_bid : ""

  coin_product ||--o{ coin_purchase : ""
  coin_purchase ||--o| coin_deposit : ""
```

テーブルは役割ごとに5つに分かれる。

- マスタ（運営が作る）: `genre`、`card`、`rarity_threshold`、`pack`、`pack_slot_rate`、`coin_product`
- 所持と開封: `user_card`、`card_discovery`、`pack_opening`、`free_pack_allowance`
- 通貨: `coin_deposit`、`coin_withdraw`、`coin_deposit_withdraw`、`coin_purchase`
- 通知: `notification` はタイトルと本文、`notification_user` は宛先と既読状態を保持する。同じ通知・利用者の組み合わせは1件に限る。
- マーケット: `market_listing`、`auction_bid`

## enum

値は `packages/db/src/enums.ts` にまとめてある。

| enum                  | 値                                                           | 使う列                                 |
| --------------------- | ------------------------------------------------------------ | -------------------------------------- |
| rarity                | `common` / `rare` / `super_rare` / `legendary` | `card.rarity`、`pack_slot_rate.rarity` |
| pack_type             | `free_basic` / `premium`                                     | `pack.type`                            |
| pack_payment          | `free_initial` / `free_daily` / `coin`                       | `pack_opening.payment`                 |
| user_card_status      | `owned` / `listed` / `fused`                                 | `user_card.status`                     |
| listing_format        | `fixed_price` / `auction`                                    | `market_listing.format`                |
| listing_status        | `active` / `sold` / `cancelled` / `expired`                  | `market_listing.status`                |
| bid_status            | `leading` / `outbid` / `won`                                 | `auction_bid.status`                   |
| coin_deposit_source   | `purchase` / `market_sale` / `bid_refund` / `admin_grant`    | `coin_deposit.source`                  |
| coin_withdraw_purpose | `pack_open` / `market_buy` / `auction_bid` / `admin_revoke`  | `coin_withdraw.purpose`                |
| purchase_provider     | `mock` / `stripe` / `app_store` / `google_play`              | `coin_purchase.provider`               |
| purchase_status       | `pending` / `completed` / `failed` / `refunded`              | `coin_purchase.status`                 |

SQLite には enum 型がないため、Drizzle の `text("...", { enum: [...] })` で TypeScript 側の型を絞り込む。

## マスタ

### genre

カードとジャンルパックの分類。Wikipedia の記事に紐づく Wikidata の「分類」（instance of、P31）をそのまま使う。こちらでジャンルを決めたり、まとめたりはしない。

| 列        | 型          | 説明                                                              |
| --------- | ----------- | ----------------------------------------------------------------- |
| slug      | text unique | Wikidata の ID（`Q5` など）。seed のサンプルは `sample-` で始まる |
| name      | text        | 表示名。分類の日本語ラベル（「人間」など）                        |
| colorHex  | text        | カード枠や開封演出の背景色。Wikidata の ID から機械的に決める     |
| sortOrder | integer     | 一覧の並び順。カードの多いジャンルから並べる                      |

- 分類の数だけジャンルができるので、数百以上になる。
- 名前は、初めて出てきたときの日本語ラベルで固定する。Wikidata でラベルが変わっても追わない。

### card

Wikipedia の記事1ページに対応するカード。所持品ではなく、カードの種類を表す。

| 列                  | 型             | 説明                                                       |
| ------------------- | -------------- | ---------------------------------------------------------- |
| wikiLang            | text           | 言語版。`ja` など                                          |
| wikiPageId          | integer        | Wikipedia の page_id。改名されても変わらない               |
| title               | text           | 記事タイトル                                               |
| wikiRevisionId      | integer null   | 取り込んだ時点の版 ID。seed のサンプルカードは null        |
| wikiFetchedAt       | timestamp null | 記事を取り込んだ日時。seed のサンプルカードは seed の日時  |
| summary             | text           | 冒頭の要約。CC BY-SA 4.0                                   |
| imageUrl            | text null      | Wikimedia Commons のフリーライセンス画像だけを入れる       |
| imageCredit         | text null      | 画像の作者とライセンス表記                                 |
| genreId             | text → genre   | 属するジャンル。1枚につき1つ                               |
| rarity              | rarity         | 作成時に固定する                                           |
| monthlyPageviews    | integer        | レアリティ判定に使った月平均閲覧数                         |
| pageviewsMeasuredAt | timestamp      | 閲覧数を取った日時                                         |
| isActive            | boolean        | false にすると新しく排出されなくなる。所持済みのものは残る |

- `(wikiLang, wikiPageId)` に unique 制約をつける。同じ記事のカードを二重に作らない。
- `(genreId, rarity, isActive)` に index をつける。抽選でジャンルとレアリティから候補を引くため。
- Wikipedia へのリンクは `https://{wikiLang}.wikipedia.org/wiki/{title}` で作る。改名されても Wikipedia 側のリダイレクトで記事にたどり着ける。
- 取り込んだ時点の版へのリンク `https://{wikiLang}.wikipedia.org/w/index.php?oldid={wikiRevisionId}` を API で返す。要約はこの版の冒頭から取っている。カード詳細には版のリンクを表示しない。

### rarity_threshold

レアリティごとの月間閲覧数の下限。言語版ごとに、C以外の3行を持つ。

| 列                  | 型      | 説明                                   |
| ------------------- | ------- | -------------------------------------- |
| wikiLang            | text    | 言語版                                 |
| rarity              | rarity  | `rare` 以上。Cは下限がない    |
| minMonthlyPageviews | integer | このレアリティになる月平均閲覧数の下限 |

- `(wikiLang, rarity)` に unique 制約をつける。
- 下限はレジェンド10万回、SR5万回、R1万回とする。
- 下限を変えても、すでにあるカードのレアリティは変わらない。
- 計算は `packages/db/src/rarity.ts` に置く。seed も同じ計算で下限を入れる。

### pack

開封できるパックの種類。

| 列                | 型                | 説明                                                  |
| ----------------- | ----------------- | ----------------------------------------------------- |
| slug              | text unique       | URL 用                                                |
| name              | text              | 「基本パック」「SR1枚確定ガチャ」など            |
| description       | text              |                                                       |
| type              | pack_type         | `free_basic` は無料枠で開ける。`premium` は pt が必要 |
| genreId           | text null → genre | null なら全ジャンルから出る                           |
| priceCoins        | integer null      | `premium` のときの価格                                |
| cardsPerPack      | integer           | 5                                                     |
| imageUrl          | text null         | パックの絵柄。null なら colorHex から描く             |
| colorHex          | text              | パックの色                                            |
| startsAt / endsAt | timestamp null    | 販売期間。null なら無期限                             |
| isActive          | boolean           |                                                       |
| sortOrder         | integer           | カルーセルの並び順                                    |

### pack_slot_rate

パックの何枚目に、どのレアリティが、どの重みで出るか。排出率表示の元データでもある。

| 列     | 型          | 説明                                       |
| ------ | ----------- | ------------------------------------------ |
| packId | text → pack |                                            |
| slot   | integer     | 1〜5（何枚目か）                           |
| rarity | rarity      |                                            |
| weight | integer     | 重み。同じ枠の合計で割ったものが確率になる |

- `(packId, slot, rarity)` に unique 制約をつける。
- 確率を小数で持たず整数の重みで持つ。合計が100%にならない設定ミスを避け、表示時に計算するため。

初期値（重みは10000分率）。seed（`packages/db/src/seed/master-data.ts`、`packages/db/src/seed/packs.ts`）もこの値で作る。

| パック | 枠 | C | R | SR | レジェンド |
| --- | --- | --- | --- | --- | --- |
| 基本パック | 1〜3 | 10000 | 0 | 0 | 0 |
| 基本パック | 4 | 9500 | 350 | 100 | 50 |
| 基本パック | 5 | 8600 | 1000 | 300 | 100 |
| 両確定ガチャ | 1〜3 | 10000 | 0 | 0 | 0 |
| 両確定ガチャ | 4 | 9500 | 350 | 100 | 50 |
| SR1枚確定ガチャ | 5 | 0 | 0 | 10000 | 0 |
| レジェンド1枚確定ガチャ | 5 | 0 | 0 | 0 | 10000 |

### coin_product

ショップで売る pt の商品。

| 列          | 型          | 説明                                    |
| ----------- | ----------- | --------------------------------------- |
| sku         | text unique | 各ストアの商品 ID と対応させる          |
| name        | text        | 「1,000pt」など                         |
| coins       | integer     | 付与する有償 pt                         |
| isActive    | boolean     |                                         |
| sortOrder   | integer     |                                         |

## 所持と開封

### pack_opening

パックを1回開けた記録。抽選結果はここに紐づく `user_card` として残る。

| 列         | 型             | 説明                                             |
| ---------- | -------------- | ------------------------------------------------ |
| userId     | text → user    |                                                  |
| packId     | text → pack    |                                                  |
| payment    | pack_payment   | 無料枠か、pt か（旧履歴には登録特典も残る）      |
| coinsSpent | integer        | 無料なら 0                                       |
| revealedAt | timestamp null | 開封演出を最後まで見た（結果画面に到達した）日時 |

- 抽選は「これにする」を押した時点でサーバーが行い、結果を保存してから演出を始める。演出中にリロードしても引き直しにはならず、`revealedAt` が null の開封は開封履歴から演出を再開できる。
- `(userId, createdAt)` に index をつける。開封履歴を新しい順に出すため。

### free_pack_allowance

無料パックの残り枠。ユーザー1人につき1行。

| 列                             | 型                  | 説明                                               |
| ------------------------------ | ------------------- | -------------------------------------------------- |
| userId                         | text unique → user  |                                                    |
| fullAt                         | integer             | 10回分まで回復する時刻（Unixミリ秒）               |

- 行がないユーザーは満杯。開封時は現在時刻と満杯になる時刻の遅い方に10分を足す。
- 満杯までの残り時間を10分単位で切り上げた数が、消費済みの枠数になる。
- 同時に開封されても残数を超えないよう、1回分以上残っている場合だけ更新する。

### user_card

ユーザーが持っている1枚1枚のカード。同じカードを3枚持っていれば3行ある。
マーケットに1枚単位で出品するため、枚数のカウンターではなく1枚ごとに行を持つ。

| 列             | 型                       | 説明                                                         |
| -------------- | ------------------------ | ------------------------------------------------------------ |
| userId         | text → user              | いまの持ち主。マーケットで売れたら買った人に書き換える       |
| cardId         | text → card              |                                                              |
| status         | user_card_status         | `owned` 所持中、`listed` 出品中、`archived` 履歴のみ         |
| packOpeningId  | text null → pack_opening | どの開封で出たか                                             |

- `(userId, status, cardId)` に index をつける。コレクション画面で所持中のカードをまとめて数えるため。

### card_discovery

ユーザーが一度でも手に入れたカード。NEW 判定とカード詳細の閲覧可否の判定に使う。

| 列              | 型          | 説明 |
| --------------- | ----------- | ---- |
| userId          | text → user |      |
| cardId          | text → card |      |
| firstAcquiredAt | timestamp   |      |

- `(userId, cardId)` に unique 制約をつける。
- 売却で手放しても消さない。再取得したカードを初獲得として扱わないため。
- 手に入れたことのないカードは、カード詳細を開けない。

## 通貨

pt の残高を1つの数値として持つテーブルは作らない。
獲得（`coin_deposit`）と、消費をどの獲得分から払ったか（`coin_deposit_withdraw`）を記録し、残高はその差として求める。

```txt
残高 = coin_deposit.amount の合計 − coin_deposit_withdraw.amount の合計
獲得1件の残り = その coin_deposit.amount − その獲得に割り当てた coin_deposit_withdraw.amount の合計
```

- 獲得1件ごとに有償か無償かを持つので、残高を有償・無償に分けて出せる。資金決済法で有償分の未使用残高を報告・保全するのに使う。
- どの獲得分を消費したかが残るので、獲得ごとに有効期限を設けたくなったときも、期限切れの分だけを除いて計算できる。
- 記録は追記のみで、更新・削除はしない。

### coin_deposit

pt を獲得した記録。

| 列              | 型                  | 説明                                        |
| --------------- | ------------------- | ------------------------------------------- |
| userId          | text → user         |                                             |
| source          | coin_deposit_source | 購入、売上、入札の返金、運営からの付与      |
| isPaid          | boolean             | 課金で得た有償 pt なら true。それ以外は無償 |
| amount          | integer             | 獲得した pt                                 |
| coinPurchaseId  | text null           | 獲得の理由に応じて関連するものを入れる      |
| marketListingId | text null           | 売上のときの出品                            |
| auctionBidId    | text null           | 入札の返金のときの入札                      |
| note            | text null           | 運営による付与の理由など                    |

- `(userId, createdAt)` に index をつける。

### coin_withdraw

pt を消費した記録。

| 列              | 型                    | 説明                                       |
| --------------- | --------------------- | ------------------------------------------ |
| userId          | text → user           |                                            |
| userSequence    | integer               | ユーザーごとの消費の通し番号。1 から始まる |
| purpose         | coin_withdraw_purpose | パックの開封、マーケットでの購入、入札など |
| amount          | integer               | 消費した pt                                |
| packOpeningId   | text null             | 消費の目的に応じて関連するものを入れる     |
| marketListingId | text null             |                                            |
| auctionBidId    | text null             |                                            |
| note            | text null             |                                            |

- `(userId, userSequence)` に unique 制約をつける。同じユーザーが同時に2回消費しようとしたとき、後から書いた方が制約違反になり、その batch ごと取り消される。残高を超えて消費されるのを防ぐため。
  - 消費の直前に残高と「最後の通し番号」を読み、通し番号 +1 で書く。

### coin_deposit_withdraw

1回の消費を、どの獲得分からいくら払ったかに割り当てる。

| 列         | 型                   | 説明                    |
| ---------- | -------------------- | ----------------------- |
| depositId  | text → coin_deposit  |                         |
| withdrawId | text → coin_withdraw |                         |
| amount     | integer              | この獲得分から払った pt |

- `(depositId, withdrawId)` に unique 制約、`withdrawId` に index をつける。
- 割り当ては無償 pt から先に、同じ種類なら古い獲得分から順に行う。利用規約と資金決済法に基づく表示にもこの順番を書いている。
- 1回の消費の割り当ての合計は、`coin_withdraw.amount` と一致する。

### coin_purchase

課金の記録。

| 列                       | 型                  | 説明                                                       |
| ------------------------ | ------------------- | ---------------------------------------------------------- |
| userId                   | text → user         |                                                            |
| coinProductId            | text → coin_product |                                                            |
| provider                 | purchase_provider   | `mock` はローカル開発用の支払いなしの購入                  |
| providerPaymentId        | text                | Stripe の Checkout Session ID、ストアのトランザクション ID |
| amount / currency        | integer null / text null | App Storeの取引金額（通貨の最小単位）と通貨。どちらかが未取得なら両方NULL |
| coins                    | integer             | 付与した pt                                                |
| status                   | purchase_status     |                                                            |
| completedAt / refundedAt | timestamp null      |                                                            |

- `(provider, providerPaymentId)` に unique 制約をつける。Webhook が二重に届いても pt を二重に付与しないため。
- 購入が完了したら、`isPaid = true` の `coin_deposit` を作る。
- iOSの購入はApp Storeの取引を検証し、購入と有償pt付与を同じD1バッチで記録する。

## マーケット

### market_listing

カード1枚の出品。新規出品はオークション形式。過去の固定価格取引は履歴として保持する。

| 列           | 型               | 説明                           |
| ------------ | ---------------- | ------------------------------ |
| sellerId     | text → user      |                                |
| userCardId   | text → user_card | 出品しているカード             |
| cardId       | text → card      | 検索用に複製する               |
| format       | listing_format   |                                |
| status       | listing_status   |                                |
| price        | integer null     | 過去の固定価格                   |
| startPrice   | integer null     | オークションの開始価格         |
| currentPrice | integer null     | オークションのいまの最高入札額 |
| bidCount     | integer          |                                |
| endsAt       | timestamp null   | オークションの終了日時         |
| buyerId      | text null → user | 成立したときの買い手           |
| soldPrice    | integer null     | 成立価格                       |
| soldAt       | timestamp null   |                                |

- `userCardId` に `status = 'active'` の部分 unique index をつける。同じカードを二重に出品させないため。
- `(status, format, cardId)`、`(status, endsAt)`、`(sellerId, createdAt)` に index をつける。
- 出品すると `user_card.status = listed` にし、取り下げや期限切れで `owned` に戻す。
- 売れたら `user_card.userId` を買い手に書き換えて `owned` に戻し、買い手に `card_discovery` を足す。
- 入札のあるオークションは取り下げられない。

### auction_bid

オークションへの入札。

| 列        | 型                    | 説明                                            |
| --------- | --------------------- | ----------------------------------------------- |
| listingId | text → market_listing |                                                 |
| bidderId  | text → user           |                                                 |
| sequence  | integer               | 出品ごとの入札の通し番号。1 から始まる          |
| amount    | integer               |                                                 |
| status    | bid_status            | `leading` 最高額、`outbid` 抜かれた、`won` 落札 |

- `(listingId, sequence)` に unique 制約をつける。同時に入札されたとき、後から書いた方の batch を失敗させる。
- 入札すると、その額をその場で消費する（`coin_withdraw` の `auction_bid`）。抜かれたら、払ったときと同じ有償・無償の内訳で `coin_deposit`（`bid_refund`）を作って返す。落札したら返さない。
  - 落札時に残高が足りない、という状態を起こさないため。
- 出品者と、いま最高額の入札者は入札できない。
- 開始価格と初回入札額の下限は10pt。初回は開始価格以上で入札できる。現在の最高入札額が1,000pt未満なら10pt、1,000〜4,999ptなら100pt、5,000〜9,999ptなら250pt、10,000〜49,999ptなら500pt、50,000pt以上なら1,000ptを最低上乗せ額とする。

## 整合性を守る処理

D1 はアプリから任意のトランザクションを張れないため、次の方針をとる。

- 複数の書き込みは Drizzle の `db.batch()` でまとめる。batch は1つのトランザクションとして実行され、途中で失敗するとすべて取り消される。
- 同時に起きると困る書き込みは、通し番号の unique 制約（`coin_withdraw.userSequence`、`auction_bid.sequence`）か、条件付き UPDATE（`status = 'active'` のときだけ更新、など）で1件だけを通す。
- 同じ batch で作った行を別の行から参照するときは、id を手で作らず、unique な列で引くサブクエリを値にする（例: `(select id from coin_withdraw where user_id = ? and user_sequence = ?)`）。
- D1 は1文あたりのバインド変数が 100 個までなので、多くの行を書くときは文を分ける。
- 終了したオークションの締めは、マーケットの一覧・詳細・取引の管理を開いたときに行う。Cron Trigger での定期実行は未実装。

### パック開封

1. 有料パックは残高を確かめる。
2. 抽選: サーバーは各枠のレアリティを `pack_slot_rate` で決め、該当する有効なカードから等確率で1枚ずつ選び、レアリティの低い順に並べる。乱数は `crypto.getRandomValues` を使う。
3. 無料パックは `free_pack_allowance` を条件付き UPDATE で減らす。
4. `pack_opening` を作る。
5. batch で `user_card` 5行、`card_discovery`（新規分）、有料なら `coin_withdraw` と `coin_deposit_withdraw` を書く。
6. batch が失敗したら、`pack_opening` を消し、無料枠を戻す。

### オークションの入札

1. 出品が受付中か、入札額が最低額以上か、自分が出品者や最高額の入札者でないかを確かめる。
2. batch で、前の最高額の入札を `outbid` にしてその人に返金し、新しい入札（通し番号 = これまでの入札数 + 1）、入札者の `coin_withdraw` と割り当て、`market_listing` の現在価格と入札数を書く。

### オークションの締め

1. 終了時刻を過ぎた `active` のオークションを探す。
2. 入札がなければ `expired` にし、カードを `owned` に戻す。
3. 入札があれば `sold` にし、batch で入札を `won` に、カードを落札者に移し、出品者に無償 `coin_deposit`（`market_sale`）を作る。落札者の pt は入札時に消費済み。

## Wikipedia からのカード作成

日本語版の全記事から候補を作り、閲覧数を結合する。分類、要約、画像の帰属情報を付けた結果と除外理由をR2に版ごとに保存する。D1への登録では記事IDと言語で照合し、既存カードのIDとレアリティを保持する。具体的な手順は [取り込みとseed](../development/wiki-seed.md) を参照。

### 除外の条件

`packages/wiki-import/src/get-exclusion-reason.ts` と `import-cards.ts` で判定する。人の確認ははさまない。外し漏れたカードは、JSONL の `isActive` を false にして止める。

- 記事以外のページ（名前空間が 0 でないページと、分類が「ウィキメディア」で始まるページ）
- 曖昧さ回避のページ
- タイトルに「一覧」を含む記事
- 事件・事故・テロ・殺人・災害を名前に含むカテゴリに入っている記事
- 要約が30文字に満たない記事
- Wikidata の分類がない記事

### API の呼び方

新形式ではカテゴリ・分類・代表画像と帰属をダンプ作成時に結合する。ダンプだけで確定できない画像の補完に ImageInfo API を使う。公開時は保存したメタデータを使う。

- User-Agent に、アプリ名と連絡先としてリポジトリの URL を入れる（`wiki-collection/0.1 (+https://github.com/matsupiee/wiki-collection)`）。Wikimedia の User-Agent ポリシーに従うため。
- 同時に投げるリクエストは3本までにする。Action API には `maxlag=5` を付ける。
- 429、5xx、maxlag のエラーは、`Retry-After` の秒数か、1秒から倍々に待って4回まで再試行する。
- タイトル、要約、版IDは同じ記事ダンプから読み込む。旧形式のTSVでは記事IDを最大20件ずつ指定して要約と版IDを取得する。
