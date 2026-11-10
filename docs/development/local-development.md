# ローカルで動かす

Cloudflare のアカウントなしで、アプリとテストをローカルで動かす手順。

## 前提

- `bun install` を済ませておく。
- 開発サーバーは `bun run dev:local` で起動する。Cloudflare の認証は不要。
- Alchemy はデプロイに使う。デプロイには Cloudflare の認証が必要。

## 起動する

```bash
bun run db:seed    # ローカルの D1 を作り直し、サンプルデータを入れる
bun run dev:local  # http://localhost:3001 で起動する
```

- `dev:local` は `apps/web/vite.local.config.ts` と `apps/web/wrangler.local.jsonc` を使う。`@cloudflare/vite-plugin` が Worker と D1 をローカルで再現する。
- ローカルの D1 は `.wrangler/state/v3/d1/` に保存される（git には入らない）。`db:seed` と `wiki:load` も同じ DB に書く。
- 既存データで起動するときは `bun run dev:local` だけを実行する。`db:seed` は全データを消してサンプルを作り直すため、起動のたびに実行しない。
- 以前の Alchemy 開発用 DB（`packages/infra/.alchemy/local/d1/`）は使わない。そこに作ったアカウントやデータは自動移行されない。旧 DB のファイルは削除しない。
- `wrangler.local.jsonc` の `PAYMENT_MODE=mock` により、ショップで支払いなしに pt を購入できる。本番（Alchemy の設定）には入れていない。

## seed で作るデータ

`packages/db/src/seed/index.ts` が作る。実行するたびに全データを消して作り直す。

- カード 60 枚。ジャンルは Wikidata の分類に似せた 26 個のサンプル（slug は `sample-` で始まる）。レアリティは月間閲覧数の順位で決め、その下限を `rarity_threshold` に入れる。要約は本アプリ用に書いた短い説明で、Wikipedia の本文ではない。
- パック3種類（無料の基本パック、100ptのダブルレア確定ガチャ、500ptのレジェンド確定ガチャ）と、pt の商品 3 種類。
- 既存のローカルDBで販売パックだけ切り替えるには `bun run db:seed:packs` を実行する。旧ジャンルパックの開封履歴は保持する。
- ユーザー 4 人。パスワードはすべて `password1234`。

| メールアドレス     | 状態                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| taro@example.com   | 登録したばかり。無料パックが 10 開けられる                                              |
| hanako@example.com | カードを集めている。フリマとオークションに出品中、演出を見ていない開封がある、pt がある |
| jiro@example.com   | hanako のオークションに入札中。終了済みのオークションで落札待ち                         |
| shiro@example.com  | 今日の 10 パックを使い切った                                                            |

## Wikipedia からカードを取り込む

```bash
bun run wiki:top                # 閲覧数の dump（直近1か月、数 GB）から上位 10 万件の一覧を作る
bun run wiki:import --limit 30  # 一覧の上から 30 件を調べて JSONL に書き足す
bun run wiki:load               # JSONL をローカルの D1 に入れる
```

- `wiki:top` は、Wikimedia の閲覧数の dump をダウンロードしながら `bzip2` で展開して読む。`bzip2` コマンドが必要。`--months <n>` で直近何か月分の月平均にするかを指定できる（既定 1）。ダウンロード済みの dump は `--file <path>` で使え、指定したファイルの数を月数とする。結果は `packages/wiki-import/.cache/top-pages-ja.tsv` に書き、git には入れない。
- `wiki:import` は、Wikipedia の API と Wikidata の SPARQL を使い、`packages/wiki-import/data/ja/` に書き足す。D1 には書かない。`--limit` は1回で調べる記事の数（既定 1000）。途中で止めても、書いた分は次の実行で取り直さない。
- 取り込んだら `git diff` で除外し漏れがないかを確かめ、コミットする。
- `wiki:load` は何度実行しても同じ状態になる。`db:seed` をやり直したら、もう一度実行する。
- 仕組みは [database.md](../design/database.md) の「Wikipedia からのカード作成」を参照。

## 画像を R2 に保存する

取得済みのカードの画像を保存する手順は [画像の保存と配信](./card-images.md) を参照。ローカルの保存先は `dev:local` と共通で、本番は `--remote` を明示する。

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

## 実際の画像付きカード100件で初期化する

`bun run db:seed:wiki` でローカルD1・R2を初期化し、Wikiカード100件と画像本体を登録できる。削除対象と確認方法は [Wikiカードのシード](./wiki-seed.md) を参照。
