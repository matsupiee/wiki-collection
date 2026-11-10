# カード画像を R2 に保存する

## ローカルで保存する

`wiki:import` で作った `packages/wiki-import/data/ja/cards/*.jsonl` の画像 URL を使う。本文の取り込みと画像の転送を別コマンドにしているため、既存データにも使える。

```bash
bun run wiki:images --limit 30
bun run wiki:load
bun run dev:local
```

- `wiki:images` の既定の上限は未保存画像1,000件。`--limit` は今回取得を試みる画像の数で、保存済みは数えない。同じコマンドで次の未保存分へ進む。
- 画像は `.wrangler/state/v3/` のローカル R2 に保存する。Cloudflare アカウントは不要。
- カードの JSONL と D1 の元 URL・作者・ライセンスは変えない。`wiki:load` はカードを D1 に読み込むためのもので、すでに読み込んであれば再実行は不要。
- SHA-256 で元 URL から作った `wiki-images/<hash>` をキーにする。同じ URL は同じオブジェクトになる。
- 転送は既定で3件並列。各ワーカーは保存完了後に1秒空ける。`--concurrency 1` で直列、`--concurrency 6` で6件並列にできる（指定範囲1〜8）。並列数を増やしても保存済み画像は取得せず、`--limit` の未保存画像の試行件数を超えない。429・5xx は最大3回、Retry-After または指数バックオフで待って再試行する。1リクエストは30秒でタイムアウトする。
- HTTPS の `upload.wikimedia.org` と `thumb.wikimedia.org` の `/wikipedia/commons/` 以下のみ取得する。画像の識別には計測用の `utm_*` パラメータを含めない。転送先も同じ条件で検査する。作者・ライセンスの記録がないカードは対象外。
- JPEG・PNG・WebP・GIF・AVIF の10MiB以下を取得し、縦横比を保ってWebPに変換する。1枚30〜50 KBを目安に品質と解像度を調整し、50,000バイトを超える画像は書き込まない。小さい画像は30 KB未満のまま保存する。既存オブジェクトは再変換しない。SVGやその他の形式、空データは保存しない。
- 失敗しても後続を処理する。失敗件数と対象 URL が出て、終了コードは1になる。保存できたものは残り、次回は失敗・未保存分を再試行できる。保存先の接続や認証のエラーでは中止する。

## 本番の R2 に保存する

Alchemy の `bun run deploy` で `CARD_IMAGES` バインディング用の非公開 R2 バケットを作る。出力の `cardImagesBucket` がバケット名。バケットの一般公開やカスタムドメインは不要。

対象バケットだけにオブジェクトの読み書きを許可した R2 S3 API の資格情報を用意し、実行環境に次を設定する。秘密鍵はソースや git 管理するファイルに書かない。

| 環境変数             | 内容                            |
| -------------------- | ------------------------------- |
| R2_ACCOUNT_ID        | Cloudflare アカウント ID        |
| R2_BUCKET_NAME       | デプロイ結果の cardImagesBucket |
| R2_ACCESS_KEY_ID     | R2 S3 API のアクセスキー ID     |
| R2_SECRET_ACCESS_KEY | R2 S3 API の秘密アクセスキー    |

```bash
bun run wiki:images --remote --limit 30
```

Bun の環境ファイル自動読み込みはこのリポジトリでは無効。上の変数はシェルなどから明示的に渡す。`--remote` を付けない限り本番には送らない。ローカルと本番のオブジェクトは独立しており、それぞれ実行する。

このコマンドは画像だけを保存する。本番 D1 にカードデータを読み込むコマンドは引き続き未実装なので、本番アプリに対象カードが登録されていることが別途必要。

## 表示と確認

画像の表示と開封時の先読みは `/api/card-images?source=<元URL>` を経由する。API は R2 を読み取り、保存済みなら画像をストリームで返す。1日のキャッシュと ETag に対応する。未保存なら元 URL に一時転送し、転送はキャッシュしない。表示リクエストでは画像のダウンロード・保存をしない。

外部通信なしの配信確認には、次のコマンドを使う。テスト用 WebP だけをローカル R2 に保存し、D1 は変更しない。

```bash
bun run db:seed:images
```

表示された URL をブラウザで開く。実画像の確認は `wiki:images` 実行後にカードを開き、ネットワーク欄で画像 API が200と `image/*` を返し、Wikimedia へ転送しないことを見る。作者・ライセンス表記も確認する。

## 参照

- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Bun S3 API と Cloudflare R2](https://bun.sh/docs/runtime/s3)
