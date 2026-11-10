# ローカルで動かす

Cloudflare のアカウントなしで、アプリとテストをローカルで動かす手順。

## 前提

- `bun install` を済ませておく。
- 開発サーバーは `bun run dev:local` で起動する。Cloudflare の認証は不要。
- Alchemy はデプロイに使う。デプロイには Cloudflare の認証が必要。

## 起動する

```bash
bun run db:seed:local    # ローカルの D1 を作り直し、サンプルデータを入れる
bun run dev:local  # http://localhost:3001 で起動する
```

- `dev:local` は `apps/web/vite.local.config.ts` と `apps/web/wrangler.local.jsonc` を使う。`@cloudflare/vite-plugin` が Worker と D1 をローカルで再現する。
- ローカルの D1 は `.wrangler/state/v3/d1/` に保存される（git には入らない）。`db:seed:local` も同じ DB に書く。
- 既存データで起動するときは `bun run dev:local` だけを実行する。`db:seed:local` は全データを消してサンプルを作り直すため、起動のたびに実行しない。
- 以前の Alchemy 開発用 DB（`packages/infra/.alchemy/local/d1/`）は使わない。そこに作ったアカウントやデータは自動移行されない。旧 DB のファイルは削除しない。
- `wrangler.local.jsonc` の `PAYMENT_MODE=mock` により、ショップで支払いなしに pt を購入できる。本番（Alchemy の設定）には入れていない。

## 開発用のカードとストーリーの確認

[Wikiカードのシード](./wiki-seed.md) で実記事500件を入れる。オークションや履歴など特定の状態が必要なテストでは、各ユーザーストーリーに記載したテスト用スクリプトを使う。

## テストする

```bash
bun run test   # packages/api と packages/wiki-import のテスト
```

- テストは Miniflare のメモリ上の D1 にマイグレーションを当てて動かす（`packages/api/src/test/create-test-db.ts`）。本番と同じ D1 の挙動（batch のトランザクション、制約違反、バインド変数の上限）で確かめるため。
- テスト用のデータは `packages/api/src/test/fixtures.ts` で作る。

## マイグレーションを作る

```bash
bun run db:generate
```

`packages/db/src/schema/` を変えたら実行する。マイグレーションファイルは手で書かない（[database-pattern.md](../rules/database-pattern.md)）。
