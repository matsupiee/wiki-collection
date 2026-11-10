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

## 記事と画像を R2 に保存する

`bun run wiki:upload-r2` は候補を500件ずつ処理し、JSONLに保存したタイトル・要約・版・カテゴリ・分類・確認済みの画像を使う。新形式を使うと、公開時の Wikipedia・Wikidata・Commons のメタデータAPI呼び出しは0件になる。除外判定とレアリティの決定後、カード、ジャンル、除外理由を gzip 圧縮した JSONL として非公開 R2 に保存する。画像のある R・SR・レジェンドは先に保存する。

`R2_ACCOUNT_ID`、`R2_BUCKET_NAME`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` を設定する。バケット名はアプリの CARD_IMAGES と合わせる。入力を変更する場合は `--input <JSONL>` を使う。以前のJSONLや2列TSVも指定できる。メタデータを持たない旧形式では公開時に従来のAPIを使う。

全分割の保存が終わると `wiki-catalog/ja/latest.json` が新しい版を指す。同じ入力で再実行すると保存済みの分割から先へ進む。全件のカードは Git に入れない。

公開時に削除済み・非対応形式・容量超過と判定した画像はカードから外す。ネットワーク障害や R2 書き込みエラーで公開に失敗した場合は、同じ候補ファイルを指定して再実行する。

## 本番 D1 に読み込む

マイグレーション適用済みの D1 の ID を `D1_DATABASE_ID` に設定し、対象アカウントの Wrangler 認証を用意する。`bun run db:seed:prod` は R2 の latest.json が指す版を1分割ずつ本番 D1 に読み込む。利用者のデータを初期化しない。同じ記事 ID は重複せず、既存カードのレアリティと版は保持する。

## ローカルで確認する

`bun run db:seed:local` は同梱の実記事500件を使う。R2の資格情報は不要。画像の取得にはネットワーク接続が必要。画像の準備が終わるとローカル D1 の利用者・所持品・取引を含むデータを初期化し、カード、基本パック、確定ガチャ2種、pt商品を登録する。

- C は325件、R は100件、SR は50件、レジェンドは25件。この件数はカードの種類数で、開封の排出率は各パックの設定に従う。
- `bun run dev:local` を起動し、iOS アプリで新規登録して基本パックを開く。
- 保存時期と配信については [画像の保存と配信](./card-images.md) を参照する。
