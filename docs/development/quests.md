# クエストの実装と確認

## 構成

`packages/db/src/quests/definitions.ts` に15段階を定義する。アプリはAPIから条件・進捗を取得する。クエスト定義や進捗カウンターのテーブルは作らない。

`prepareQuestRewards` の条件付きinsertを開封保存のbatchに含める。SQLの集計はbatch実行時に行い、処理前に読んだ古い進捗で判定しない。達成の `(user_id, quest_key)` と入金の `quest_completion_id` のunique制約で二重付与を防ぐ。支払いを先に実行するため、今回もらう報酬を開封前の不足分に使うことはできない。

D1のbatch内で条件付き挿入するためinsert-selectを使用する。Drizzleのinsert-selectは `$defaultFn` を呼ばないため、IDに限りスキーマに定義した生成関数を呼ぶ。日時はDBのdefaultを使う。独自のID生成方式は追加しない。

- [Cloudflare D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Drizzle insert-select](https://orm.drizzle.team/docs/insert#insert-into--select)
- [Expo Routerのルート構成](https://docs.expo.dev/router/basics/notation/)

## スキーマの適用

`20261114045230_quest_rewards` はdrizzle-kitで生成したスキーマ変更だけを含む。既存ユーザーへの報酬付与は含まない。API更新前に適用する。本番適用は別作業とする。

## 過去分の付与

現在のコマンドはローカル専用で、ユーザー1人ずつ処理する。最初にSQLiteのバックアップを取り、対象ユーザーと表示された件数・金額を確認する。

```sh
bun packages/db/src/seed/quests-cli.ts --user-name ゲスト名
bun packages/db/src/seed/quests-cli.ts --user-name ゲスト名 --apply
```

途中で失敗したらそのユーザーのbatch全体が取り消される。再実行しても付与済みの段階は増えない。既に消費された報酬の取り消しは通常の運用では行わない。検証環境を復旧する場合は停止中のローカルDBをバックアップに戻す。

## 確認用データ

```sh
bun packages/db/src/seed/quests-cli.ts --user-name ゲスト名 --seed
```

確認専用の排出停止パック、9回・24種類・4ジャンルの履歴を追加する。既存の履歴を初期化しないので、既存ユーザーの合計進捗はこの数字より多くなる。seedだけでは報酬を付与しない。実際の開封で付与を確認するか、件数を確認して `--apply` を実行する。

## 規約類

利用規約の無償ptの獲得元にクエスト報酬を追加し、プライバシーポリシーの利用状況にクエスト達成記録を追加した。購入価格・販売条件は変わらないため、特定商取引法表記と資金決済法表記の変更は不要と判断した。

## 確認結果

2026年11月14日、全パッケージの自動テスト181件とAPI・DB・nativeの型チェックが成功した。クエストの追加テストでは全15段階、並行開封、再実行、売却、入金失敗時の取り消しを確認した。

iPhone 17・iOS 27.0のシミュレーターで、マイページからの遷移、進捗一覧、無料開封後の7件・115pt付与表示、7/15の達成済み表示、pt履歴の無償入金7件を確認した。既存のローカル履歴と確認用seedを使っているため、新規ユーザーの初回報酬とは異なる。付与後のコマンド再実行は未付与0件・0ptだった。実機では確認していない。本番DBの変更・デプロイは行っていない。
