# 対戦・合成の開発と確認

## 前提とデータ

既存のローカルDBを保持したまま実行できる。

```bash
bun run wiki:lengths     # 保存済みの版から記事サイズを補完。JSONLだけを更新する
bun run db:seed:battle   # マイグレーション、既存記事のサイズ補完、専用利用者の追加
bun run dev:local
```

- `battle1@example.com` と `battle2@example.com`、パスワードは `password1234`。各12枚と1チームを作る。
- 再実行で同じ利用者の所持品を増やしたり、編成を戻したりしない。既存利用者は削除しない。
- 前日分の対戦結果も作る。既に前日の結果があれば変更しない。
- 初めてDBを作る場合は `bun run db:seed` でサンプルカードを用意する。このコマンドは既存データを削除する。
- 通常の `wiki:load` でも記事サイズを入れる。既存カードは未計測のサイズだけを補完し、測定済みの値を変更しない。

## 定期実行

本番では Alchemy の `crons` と `apps/web/src/server.ts` の `scheduled` が毎日日本時間0時に集計する。定期実行はUTC指定のため `0 15 * * *` を使う。画面から任意に集計する公開APIは設けない。

ローカルで本日分の集計関数だけを呼ぶには `bun run battle:run` を使う。Workerの定期ハンドラーを確認するには、開発サーバーの Local Explorer の scheduled API を使う。

```bash
curl -X POST 'http://localhost:3001/cdn-cgi/local/explorer/api/local/scheduled?worker=wiki-collection-local' \
  -H 'Content-Type: application/json' \
  -d '{"cron":"0 15 * * *"}'
```

同じ日付は再計算しない。エラー時は未保存なら再実行できる。保存後の編成変更は次回の結果へ反映される。実行時点のスナップショットなので、停止期間の過去編成を復元して集計する仕組みはない。

総当たりの計算量はチーム数の二乗、日次スナップショットは1行のJSONで保存する。大規模運用前にはD1の行サイズ制限とCron実行時間を確認し、結果の分割保存と対戦の分散処理へ移行する。

## 検証

```bash
bun run test
bun run check-types
```

全ユーザーストーリーのAPI・取込・画像テストを実行する。画面ではチーム保存・更新・解除、合成の確認と結果、カード詳細、ランキングと過去日、規約類、既存のパック・コレクション・マーケット・マイページを確認する。

## 参照した公式仕様

- [Cloudflare Scheduled Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
- [D1 batchのトランザクション](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [TanStack StartのServer Entry](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [MediaWiki記事情報](https://www.mediawiki.org/wiki/API:Info)

## 2026年11月6日の検証記録

- APIの65テスト、Wikipedia取込の29テストが成功。全7パッケージの型チェックとWebビルドが成功した。
- 既存13ストーリーは、無料枠・無料開封・有料開封・開封再開・コレクション・還元・フリマ・オークション・pt購入・pt履歴・記事取込・画像保存を各API/取込テストで確認し、規約類はブラウザで確認した。
- 新規4ストーリーは、能力値・編成・合成・日次ランキングのAPIテストとブラウザ操作で確認した。
- ブラウザでは専用利用者で3チームの作成、編集、解除、合成の確認、強化値の増加、素材消費、当日・前日・未開催日の表示を確認した。既存12画面の表示と画像の読み込みも確認した。
- 幅390pxで横方向のはみ出しがなく、確認した画面にJavaScriptエラーがないことを確認した。
- Local Explorer経由でWorkerのscheduledを呼び、`outcome: ok` と日次結果の保存を確認した。
- 保存済み860記事の長さを版IDから補完した。ローカルの既存利用者と所持品は保持した。
- 新規コードのlintは成功。リポジトリ全体のlintには、今回変更していない `apps/web/src/env.server.ts:2` の triple-slash-reference エラーが残る。
- 利用規約とプライバシーポリシーを更新した。合成・対戦に新しい支払いや報酬はないため、特定商取引法・資金決済法の表示の取引条件は変更していない。

## 記事分類に基づく属性

`packages/db/src/battle.ts` の `genreGroups` でWikidata分類IDと属性を対応付ける。元のジャンル名やカードの版を変更する必要はない。既存カードにも同じ対応表が適用される。新しい分類で自動的に推測したり、記事IDで振り分けたりせず、未対応の場合は総合として扱う。

`db:seed:battle` は新規のテスト利用者に対して、DBに存在する各属性から代表カードを選ぶ。既存利用者の所持品は変更しない。5属性すべてのサンプルが必要な独立した開発環境では `db:seed` の後に実行する。`db:seed` は既存DBを削除するので、既存の所持品を保つ環境では実行しない。

過去のランキングは再計算しない。旧属性キーは履歴を読むために残し、旧ルールの表示を付ける。ライブのカードAPIは新しい属性だけを返す。

属性変更では取得する個人情報、支払い条件、素材消費の扱いは変わらない。利用規約・プライバシーポリシー・特定商取引法の表示を確認し、追加の改訂は不要と判断した。

属性見直し後も既存を含むAPI・取込テストをすべて実行して成功した。追加テストでは5属性の相性、総合の倍率なし、分類に応じた各APIの一致、新しい日次スナップショット、旧属性の履歴互換を確認した。全パッケージの型チェックとビルドも成功した。ブラウザでは人物・PHP・テレビ作品の属性、コレクションと詳細の一致、合成候補、相性説明、旧ルール表示を確認した。
