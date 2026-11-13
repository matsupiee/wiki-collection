# iOS・Androidアプリでカードを集める

> ステータス: Expo / React Nativeで実装。ストア配信と実課金は未実装。

## ストーリー

利用者として、スマートフォンのアプリからゲストとしてカードを集め、売買を続けたい。

## 動作確認の手順

1. [開発手順](../development/native-app.md)に従ってAPIとExpoを起動する。
2. アプリを起動する。
   - 初回は自動的にゲストとして開始し、次回の起動で同じ履歴に戻れる。
   - → [Appleで引き継ぐ](./apple-restore.md)
3. パックを開封し、結果からコレクションへ移動する。
   - 5枚を順番に表示できる。中断した開封は開封履歴から再開できる。
   - → [無料パック](./open-free-pack.md)、[有料パック](./open-premium-pack.md)、[開封再開](./resume-opening.md)
4. コレクションの絞り込み・並べ替え、詳細表示を行う。
   - → [コレクション](./collection.md)、[並べ替え](./sort-collection.md)
5. オークションへの出品・入札、出品管理を行う。
   - 消費前に金額を確認できる。残高不足の取引はAPIでも拒否される。
   - → [オークション](./market-auction.md)
6. マイページから残高履歴・開封履歴・規約を確認する。
   - 規約はWeb側で管理し、アプリ内ブラウザで開く。
   - → [pt履歴](./coin-history.md)、[規約](./legal-pages.md)

## データの持ち方

- 既存のサーバーとデータベースを継続して利用する。
  - ネイティブ用の別残高・別所持カードは作らない。
- 認証CookieはBetter AuthのExpoプラグインを通じ、端末ではSecureStoreに保存する。
  - Expo Webの確認時はブラウザーのCookieを利用する。

## 対応するテスト

- `packages/api/src/test/native-auth.integration.test.ts`: ゲスト認証、Apple連携と引き継ぎ、未許可オリジン。
- `apps/web/src/lib/api-cors.test.ts`: Expo Webの開発用CORS。
- `tests/native/`: Expo Webを使ったブラウザー操作。
- `bun run test`: 全既存ストーリーのAPI・取り込み・画面ロジックの回帰テスト。
