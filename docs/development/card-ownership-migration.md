# カード所有権履歴への移行

## 変更内容

`20261114043302_card_ownership_history` で開封結果を `pack_opening_card` に移し、`user_card.user_id` を `owner_id` に変更する。`user_card.pack_opening_id` と `card_discovery` は移行後に削除する。`user_pack_card_discovery` は存在せず、追加しない。

既存の開封・売買から所有権移転を復元する。旧 `card_discovery` にしかない事実は、適用済みマイグレーションでは `legacy_acquisition` として保持する。reasonの統一は後述の独立コマンドで行い、新規seedによる初回付与は `pack_open` にする。旧データでは元の枠番号が不明なため、開封コピーのID順で番号を割り当てる。過去の枠番号から排出率を分析するときは、この移行データを使わない。

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

50行ずつ更新し、中断後の再実行では未更新行だけを処理する。ID・移転元・移転先・カード・作成日時は変更しない。復旧時はバックアップのIDに対応するreasonを戻す。適用済みの所有権履歴マイグレーションは変更しない。旧スキーマにデータがあるDBを新しく移行する場合も `legacy_acquisition` が作られるため、必要に応じて移行後に独立コマンドで統一する。本番の既存reasonはこのローカル専用コマンドの対象外で、別途対象・件数・復旧手段を確認する。

2026年11月14日、ローカルの6,659件を変換し、残存0件・再実行の更新0件を確認した。バックアップにある既存7,772行を全列比較し、reasonの指定変換以外に変更がないことを確認した。確認中に通常の売買履歴が1行追加されている。外部キー違反は0件。

全自動テスト176件、API・DBの型チェックが成功。複数バッチの変換、再実行、売買履歴の保持とseedのreasonをAPIテストで確認した。iPhone 17 / iOS 27.0シミュレーターのiOSアプリで、コレクションと旧seedカードの詳細・所持枚数を確認した。実機と本番DBでは未実施。利用者向け機能・個人情報の扱いは変わらず、要件・規約類の変更は不要。

## 適用済みマイグレーションの復元

2026年11月14日、本番で13:41:07 JSTに適用済みのSQLを、その後に変更したことで `RewrittenMigrationHistoryError` が発生した。変更点は2つのインデックス作成位置と、旧獲得記録のreasonだった。

適用時のSQLを復元し、本番 `__alchemy_migrations` のSHA-256 `8a640601475ffdbe26b3f7af3eb8813472c9ba187e8d221534cee6d5a72eb4a4` と完全一致することを確認した。DB側の履歴は変更しない。スキーマ差分はないため追加マイグレーションは不要で、reasonの更新をデプロイに含めない。

`packages/api/src/test/card-ownership-migration.integration.test.ts` で適用済みハッシュの維持、旧reasonを持つ利用者のカード閲覧、独立したreason統一と再実行、移行再実行後に旧reasonへ戻らないことを検証する。製品仕様の変更ではなく、要件・規約類の変更は不要。

復元後、全ストーリーに関わる既存の自動テスト182件（認証1件、API129件、取り込み41件、Web3件、ネイティブ8件）、APIの型チェック、変更したテストのlint・format確認が成功した。iPhone 17 / iOS 27.0シミュレーターでは、ローカルAPIに接続したiOSアプリで `tests/ios/profile-tab-reselect.yaml` が成功し、開封履歴・クエスト等への遷移を確認した。初回起動はJS配信サーバーが停止していて失敗したが、MetroとローカルAPIの起動後は成功した。実機、本番接続でのiOS操作、全ストーリーのiOS画面操作は未確認。

14:53 JSTに `packages/infra` で `bun run deploy --yes` が成功した。所有権履歴の適用日時・ハッシュは変わらず、未適用だった `20261114045230_quest_rewards` が追加された。本番の `legacy_acquisition` 98件は変更していない。これらのreason統一は今回のデプロイ復旧に含めない。
