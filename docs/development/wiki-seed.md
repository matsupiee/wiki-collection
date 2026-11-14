# Wikipedia の記事と開発用データ

## 全件の候補を作る

`bun run wiki:dump` は日本語版 Wikipedia の最新の記事 XML ダンプと、先月の月次閲覧数ダンプを取得する。Python 3、bzip2、curl が必要。標準名前空間の転送ページ以外について、記事ID、タイトル、版ID、記事サイズ、冒頭の段落をテキストにした要約、人による閲覧数を `packages/wiki-import/.cache/articles-ja.jsonl` に書く。閲覧の記録がない記事は0回とする。出力は処理が完了したときに置き換える。

手元のダンプを使う場合は `--articles <XML.bz2> --pageviews <月次.bz2>` を指定できる。

## カテゴリ・分類・画像の取得元

`wiki:dump` は記事に次の情報を結合して同じ JSONL に書く。ダンプは圧縮したまま順に取得し、結合用の索引は作業ディスク上の一時 SQLite に作る。

| 公式ダンプ | 取得する項目 |
| --- | --- |
| 日本語版の categorylinks と linktarget | 記事に付いたカテゴリ名 |
| 日本語版の page_props と image | 曖昧さ回避、Wikidata項目ID、代表画像名、日本語版に直接アップロードされたファイルの除外 |
| Wikidata の latest-all.json.bz2 | P31のランクと分類の日本語ラベル |
| Commons の latest-mediainfo.json.bz2 | ファイル名、P275のライセンス、P170の作者表記とファイルサイズ |

画像の帰属と利用条件を確認でき、元ファイルが10MiB以下の対応画像なら Commons の元画像URLを使う。ライセンスや作者の構造化情報が不足する場合、サムネイルが必要な場合などは、採用候補の画像に限り ImageInfo API を最大50ファイルずつ照会する。同じファイルの結果はその実行中に再利用する。日本語版に直接アップロードされた画像は採用しない。

`bun run wiki:dump --offline-images` では画像の補完APIを呼ばず、ダンプだけで確認できなかった画像は空欄にする。ダンプのダウンロードとR2への転送には通信が必要。

WikidataとCommonsの全件ダンプは大きく、2026年11月の2ファイルだけで圧縮時に約166GBある。一度取得した6ファイルを再利用するには、次の名前で同じディレクトリに置き、`--metadata-dir <ディレクトリ>` を指定する。日本語版のSQLファイルは同じ公開回を使う。

- `jawiki-latest-categorylinks.sql.gz`、`jawiki-latest-linktarget.sql.gz`
- `jawiki-latest-page_props.sql.gz`、`jawiki-latest-image.sql.gz`
- `latest-all.json.bz2`、`latest-mediainfo.json.bz2`

配布元は [日本語版Wikipedia](https://dumps.wikimedia.org/jawiki/latest/)、[Wikidata](https://dumps.wikimedia.org/wikidatawiki/entities/)、[Commons](https://dumps.wikimedia.org/commonswiki/entities/) を参照する。

## 月ごとに記事候補をバックアップする

`bun run wiki:backup-in-r2 --month 2026-10` は、手元の `articles-ja.jsonl` をそのまま `wiki-source/ja/2026-10/articles-ja.jsonl` に保存する。月は月次閲覧数の対象月を指定する。別の月は別のオブジェクトになり、同じ月の再実行はその月のファイルを置き換える。`--input <JSONL>` で入力を変更できる。

バックアップと画像保存には `R2_ACCOUNT_ID`、`R2_BUCKET_NAME`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` を設定する。バケット名はアプリの CARD_IMAGES と合わせる。

Wrangler のログインを使う場合は、両コマンドに `--wrangler-config <設定ファイル>` を指定する。対象アカウントと `remote: true` の `CARD_IMAGES` バインディングを設定し、画像の保存には同じ設定に本番D1の `DB` バインディングも指定する。

## カード画像を保存する

本番D1にカードを登録し、画像サイズのマイグレーションを適用してから `bun run wiki:upload-images-r2` を実行する。D1の接続設定は次節を参照する。入力は同じ記事候補で、`--input` で切り替えられる。500件ずつカード化の条件を確認し、R・SR・レジェンドの画像をWebPとして `wiki-images/` に保存する。既存WebPも含め、対応するカードに保存画像のピクセル寸法を記録する。通信エラーの場合は同じ入力で再実行できる。コモン・アンコモン画像はパック開封時に保存する。

## 本番 D1 に読み込む

マイグレーション適用済みの本番 D1 を指定し、Wrangler にログインして実行する。

```sh
bun run db:seed:prod --wrangler-config <本番のDBバインディングを含むWrangler設定ファイル>
```

設定ファイルを省略する場合は `D1_DATABASE_ID` と対象アカウントの `CLOUDFLARE_ACCOUNT_ID`（または `R2_ACCOUNT_ID`）を指定する。既定の入力は `packages/wiki-import/.cache/articles-ja.jsonl` で、別のファイルは `--input <JSONL>` で指定する。

500記事ずつカード化し、複数行のINSERTを最大16 MiBの一時SQLファイルにまとめて本番へ順次インポートする。D1のファイルインポート中は対象DBへの他のリクエストが待機する場合がある。途中で失敗したら同じコマンドを再実行する。言語と記事IDで既存カードを照合し、所持品、カードID、版、レアリティ、排出停止状態、画像寸法を維持する。

新規カードの画像寸法は未計測として登録する。先に画像をR2に保存した場合は、投入後に `wiki:upload-images-r2` を実行すると、保存済みWebPから対応するカードの寸法を補完できる。

## ローカルで確認する

`bun run db:seed:local` は同梱の実記事500件を使う。R2の資格情報は不要。画像の取得にはネットワーク接続が必要。画像の準備が終わるとローカル D1 の利用者・所持品・取引を含むデータを初期化し、カード、基本パック、確定ガチャ2種、pt商品を登録する。

- C は18件、UC は107件、R は200件、SR は150件、レジェンドは25件。この件数はカードの種類数で、開封の排出率は各パックの設定に従う。
- `bun run dev:local` を起動し、iOS アプリで新規登録して基本パックを開く。
- 保存時期と配信については [画像の保存と配信](./card-images.md) を参照する。
