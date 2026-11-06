# iOS・Androidアプリでカードを集める

> ステータス: Expo / React Nativeで実装。ストア配信と実課金は未実装。

## ストーリー

利用者として、スマートフォンのアプリから既存のアカウントでカードを集め、売買や対戦を続けたい。

## 動作確認の手順

1. [開発手順](../development/native-app.md)に従ってAPIとExpoを起動する。
   - `bun run db:seed:native` で専用の確認利用者を追加できる。既存利用者のデータは消さない。
2. 新規登録またはメールアドレスとパスワードでログインする。
   - ログイン前は所持カードなどの画面に入れない。
   - 既存のアカウント・カード・残高を利用できる。
3. パックを開封し、結果からコレクションへ移動する。
   - 5枚を順番に表示できる。中断した開封は開封履歴から再開できる。
   - → [無料パック](./open-free-pack.md)、[有料パック](./open-premium-pack.md)、[開封再開](./resume-opening.md)
4. コレクションの絞り込み・並べ替え、詳細表示、還元を行う。
   - → [コレクション](./collection.md)、[並べ替え](./sort-collection.md)、[還元](./redeem-card.md)
5. フリマへの出品・購入、オークションの入札、出品管理を行う。
   - 消費前に金額を確認できる。残高不足や編成中のカードなどはAPIでも拒否される。
   - → [フリマ](./market-fixed-price.md)、[オークション](./market-auction.md)
6. チームを編集し、順序交換・練習・強化・ランキングの詳細を確認する。
   - 保存前に閉じる場合は変更の破棄を確認できる。
   - → [編成](./build-battle-team.md)、[練習](./practice-battle.md)、[一括強化](./bulk-fuse-cards.md)、[日次順位](./daily-battle-ranking.md)
7. マイページから残高履歴・開封履歴・規約を確認し、ログアウトする。
   - ログアウト後は認証が必要な画面を表示しない。
   - 規約はWeb側で管理し、アプリ内ブラウザで開く。
   - → [pt履歴](./coin-history.md)、[規約](./legal-pages.md)

## データの持ち方

- 既存のサーバーとデータベースを継続して利用する。
  - ネイティブ用の別残高・別所持カードは作らない。
- 認証CookieはBetter AuthのExpoプラグインを通じ、端末ではSecureStoreに保存する。
  - Expo Webの確認時はブラウザーのCookieを利用する。
- 対戦の計算式、チーム選択、強化素材のグループ化は共通パッケージを利用する。規約本文をアプリには含めない。

## 対応するテスト

- `packages/api/src/test/native-auth.integration.test.ts`: ネイティブ認証、共通API、ログアウト、未許可オリジン。
- `apps/web/src/lib/api-cors.test.ts`: Expo Webの開発用CORS。
- `apps/native/lib/battle-selection.test.ts`: チーム選択と合成対象。
- `tests/native/`: Expo Webを使ったブラウザー操作。
- `bun run test`: 全既存ストーリーのAPI・取り込み・画面ロジックの回帰テスト。
