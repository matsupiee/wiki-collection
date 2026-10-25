# ローカルで動かす

Cloudflare のアカウントなしで、アプリとテストをローカルで動かす手順。

## 前提

- `bun install` を済ませておく。
- デプロイと `bun run dev`（Alchemy の dev）は Cloudflare の認証が必要。認証なしで動かすときは、下の `dev:local` を使う。

## 起動する

```bash
bun run db:seed    # ローカルの D1 を作り直し、サンプルデータを入れる
bun run dev:local  # http://localhost:3001 で起動する
```

- `dev:local` は `apps/web/vite.local.config.ts` と `apps/web/wrangler.local.jsonc` を使う。`@cloudflare/vite-plugin` が Worker と D1 をローカルで再現する。
- ローカルの D1 は `.wrangler/state/` に保存される（git には入らない）。seed も同じ場所に書く。
- `wrangler.local.jsonc` の `PAYMENT_MODE=mock` により、ショップで支払いなしに pt を購入できる。本番（Alchemy の設定）には入れていない。

## seed で作るデータ

`packages/db/src/seed/index.ts` が作る。実行するたびに全データを消して作り直す。

- カード 60 枚（6 ジャンル）。レアリティは月間閲覧数の順位で決め、その下限を `rarity_threshold` に入れる。要約は本アプリ用に書いた短い説明で、Wikipedia の本文ではない。
- パック 4 種類（無料の基本パック、150pt の宇宙・歴史・科学パック）と、pt の商品 3 種類。
- ユーザー 4 人。パスワードはすべて `password1234`。

| メールアドレス     | 状態                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| taro@example.com   | 登録したばかり。無料パックが 30 開けられる                                              |
| hanako@example.com | カードを集めている。フリマとオークションに出品中、演出を見ていない開封がある、pt がある |
| jiro@example.com   | hanako のオークションに入札中。終了済みのオークションで落札待ち                         |
| shiro@example.com  | 登録時の 20 パックも今日の 10 パックも使い切った                                        |

## Wikipedia からカードを取り込む

```bash
bun run wiki:import --genre space --max 30  # Wikipedia から取って JSONL に書き足す
bun run wiki:load                           # JSONL をローカルの D1 に入れる
```

- `wiki:import` は、Wikipedia の記事から作ったカードを `packages/wiki-import/data/ja/cards/{slug}.jsonl` に書き足す。D1 には書かない。Wikipedia の API に接続できる必要がある。
- `--genre` はジャンルの slug。複数指定でき、省略するとすべてのジャンルを取り込む。`--depth` はサブカテゴリをたどる深さ（既定 1）、`--max` はジャンルごとに調べる記事の数の上限（既定 100）。
- 取り込んだら `git diff` で除外し漏れがないかを確かめ、コミットする。
- `wiki:load` は、ジャンルを D1 から引くので、`bun run db:seed` のあとに実行する。何度実行しても同じ状態になる。`db:seed` をやり直したら、もう一度実行する。
- 仕組みは [database.md](../design/database.md) の「Wikipedia からのカード作成」を参照。

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
