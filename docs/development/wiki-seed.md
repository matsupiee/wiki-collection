# 実際のWikiカード100件でローカル環境を初期化する

## 前提

- `bun install` を済ませ、開発サーバーを停止する。
- 画像をWikimediaから取得するためインターネット接続が必要。
- このコマンドはローカルD1の全アプリデータ（ユーザー、セッション、所持カード、取引、マスター）とローカルR2の全オブジェクトを削除する。マイグレーション履歴は保持する。

## 実行方法

```bash
bun run db:seed:wiki
bun run dev:local
```

- `packages/db/src/seed/wiki-cli.ts` が入口。`dev:local` と同じ `.wrangler/state/v3` を使う。リモート指定は受け付けない。
- リポジトリの `packages/wiki-import/data/ja/` から、有効で画像URL・クレジット・ジャンルがあるカードを閲覧数順に100件選ぶ。同順位はページID順。100件に満たなければ削除前に終了する。
- 100件の順位からローカル用のレアリティと下限値を計算する。元のJSONLは変更しない。
- DBには記事・版・要約・画像の元URL・クレジットを保持し、R2には元URLから決まるキーで画像本体とContent-Typeを保存する。画像URLが共通ならR2の保存件数は100未満になる。
- 画像の保存に失敗すると終了コード1になる。DBは空で、R2には取得済み画像が残る。通信状況を確認して同じコマンドを再実行する。
- 基本パック、確定ガチャ2種類とpt商品も作る。ユーザーは作らないのでブラウザから新規登録する。
- 従来の `bun run db:seed` は4人のユーザー・出品・入札を含むストーリー確認用。各ストーリーの確認には従来のコマンドを使う。

## 確認方法

- 完了ログにカード100件と画像保存件数が出る。
- 新規登録後、基本パックを開封し、画像とクレジットが表示されることを確認する。
- 画像の `/api/card-images` が200を返し、Wikimediaへリダイレクトしないことを確認する。
- `bun run test` で全ストーリーに対応する既存APIテスト・取込テストと、初期化・再実行・画像配信の統合テストを実行する。

実装はCloudflare公式の [getPlatformProxy](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy) と [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) に沿ってローカルバインディングを操作する。
