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

- カード 60 枚。ジャンルは Wikidata の分類に似せた 26 個のサンプル（slug は `sample-` で始まる）。レアリティは月間閲覧数の順位で決め、その下限を `rarity_threshold` に入れる。要約は本アプリ用に書いた短い説明で、Wikipedia の本文ではない。
- パック 4 種類（無料の基本パック、150pt の天体・人間・スポーツパック）と、pt の商品 3 種類。
- ユーザー 4 人。パスワードはすべて `password1234`。

| メールアドレス     | 状態                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| taro@example.com   | 登録したばかり。無料パックが 30 開けられる                                              |
| hanako@example.com | カードを集めている。フリマとオークションに出品中、演出を見ていない開封がある、pt がある |
| jiro@example.com   | hanako のオークションに入札中。終了済みのオークションで落札待ち                         |
| shiro@example.com  | 登録時の 20 パックも今日の 10 パックも使い切った                                        |

## Wikipedia からカードを取り込む

```bash
bun run wiki:top                # 閲覧数の dump から上位 10 万件の一覧を作る（数 GB × 12 か月を読む）
bun run wiki:import --limit 30  # 一覧の上から 30 件を調べて JSONL に書き足す
bun run wiki:load               # JSONL をローカルの D1 に入れる
```

- `wiki:top` は、Wikimedia の閲覧数の dump をダウンロードしながら `bzip2` で展開して読む。`bzip2` コマンドが必要。ダウンロード済みの dump は `--file <path>` を 12 回指定して使える。結果は `packages/wiki-import/.cache/top-pages-ja.tsv` に書き、git には入れない。
- `wiki:import` は、Wikipedia の API と Wikidata の SPARQL を使い、`packages/wiki-import/data/ja/` に書き足す。D1 には書かない。`--limit` は1回で調べる記事の数（既定 1000）。途中で止めても、書いた分は次の実行で取り直さない。
- 取り込んだら `git diff` で除外し漏れがないかを確かめ、コミットする。
- `wiki:load` は何度実行しても同じ状態になる。`db:seed` をやり直したら、もう一度実行する。
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
