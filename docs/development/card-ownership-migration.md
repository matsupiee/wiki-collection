# カード所有権履歴への移行

## 変更内容

`20261114043302_card_ownership_history` で開封結果を `pack_opening_card` に移し、`user_card.user_id` を `owner_id` に変更する。`user_card.pack_opening_id` と `card_discovery` は移行後に削除する。`user_pack_card_discovery` は存在せず、追加しない。

既存の開封・売買から所有権移転を復元する。旧 `card_discovery` にしかない事実は `pack_open` として保持する。seedによる初回付与も `pack_open` に統一する。旧データでは元の枠番号が不明なため、開封コピーのID順で番号を割り当てる。過去の枠番号から排出率を分析するときは、この移行データを使わない。

## 適用

開発用は通常の `openLocalDb()` を使うseedコマンドで移行する。既存データをリセットするseedは不要。

```sh
bun packages/db/src/seed/ownership-history-cli.ts --user-name ゲスト名
```

スキーマとAPIを同時に切り替える必要がある。古いAPIは削除した列を参照するため、開発サーバーが共有パッケージの変更を反映していなければ再起動する。本番への適用はこの作業では行わない。

## D1の移行方法

D1ではトランザクション内で `foreign_keys = OFF` にできないため、公式の案内に従って `defer_foreign_keys = ON` を使う。参照先の `user_card` は一時表に退避してから元の名前で再作成し、行を再挿入する。参照制約はコミット時に検証する。`defer_foreign_keys = OFF` で未解消の制約違反を捨てる処理は行わない。

新テーブルへコピーしてrenameする方式は、既存の参照行があるMiniflareのD1で内部エラーになった。元の名前への再作成・再挿入では既存データ入りの移行テストが成功した。

- [Cloudflare D1の外部キー](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
- [Cloudflare D1のbatch](https://developers.cloudflare.com/d1/worker-api/d1-database/)

## 規約類

取得・取引履歴の保存方法を変更するもので、利用者向けの機能、購入条件、収集する個人情報の種類は変わらない。`apps/web/src/lib/legal.ts` を確認し、利用規約・プライバシーポリシー・特定商取引法表記の変更は不要と判断した。`docs/requirement.md` の追加修正も不要。

## 2026年11月14日の確認結果

- 全ストーリーに関わる既存の自動テストを含め、`bun run test` の175件が成功（認証1件、API122件、取り込み41件、Web3件、ネイティブ8件）。
- API・DB・ネイティブの型チェック、変更したTypeScriptファイルのlintが成功。
- 既存データ入りのD1移行テストと、移行の再実行を確認した。ローカルDBも事前にバックアップして移行し、外部キー違反は0件だった。
- iPhone 17 / iOS 27.0シミュレーターのiOSアプリで、移行前からの開封履歴、確認用の5枚の開封結果、1枚移転後の所持4枚、新規の無料開封から結果表示まで確認した。
- `ownership-history-cli.ts` の再実行が成功し、重複したデータを作らないことを確認した。

初回のiOS履歴確認では読み込みエラーが表示された。ローカルAPIは応答しており、開発サーバーを再起動すると同じアプリから履歴を表示できた。共有パッケージ変更の反映遅れが疑われるが、iOSの通信障害とは断定していない。

iOS実機と全ストーリーのiOS画面操作は未確認。本番DBへの適用・デプロイは行っていない。

## reasonの統一

所有権履歴のreasonは `pack_open` と `market_sale` の2種類とする。seedの付与と旧獲得記録も暫定的に `pack_open` にする。このためreasonだけでは実際のパック開封を判別できない。開封由来の集計には `pack_opening_card` と `pack_opening` を使う。

既に作成済みの旧reasonは、移行・起動時ではなく次の独立コマンドで変換する。

```sh
bun packages/db/src/seed/normalize-ownership-reasons-cli.ts
# ローカルDBのバックアップを取った後に実行する。
bun packages/db/src/seed/normalize-ownership-reasons-cli.ts --apply
```

50行ずつ更新し、中断後の再実行では未更新行だけを処理する。ID・移転元・移転先・カード・作成日時は変更しない。復旧時はバックアップのIDに対応するreasonを戻す。新規構築用の所有権履歴移行も `pack_open` を書き込むため、旧reasonを生成する処理は残らない。

2026年11月14日、ローカルの6,659件を変換し、残存0件・再実行の更新0件を確認した。バックアップにある既存7,772行を全列比較し、reasonの指定変換以外に変更がないことを確認した。確認中に通常の売買履歴が1行追加されている。外部キー違反は0件。

全自動テスト176件、API・DBの型チェックが成功。複数バッチの変換、再実行、売買履歴の保持とseedのreasonをAPIテストで確認した。iPhone 17 / iOS 27.0シミュレーターのiOSアプリで、コレクションと旧seedカードの詳細・所持枚数を確認した。実機と本番DBでは未実施。利用者向け機能・個人情報の扱いは変わらず、要件・規約類の変更は不要。
