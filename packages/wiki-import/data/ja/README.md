# 日本語版 Wikipedia から取り込んだカード

`bun run wiki:import` が書き足し、`bun run wiki:load` が D1 に入れる。手順は [database.md](../../../../docs/design/database.md) の「Wikipedia からのカード作成」を参照。

## ライセンス

このディレクトリのデータは、リポジトリのほかのファイルとはライセンスが違う。

- 要約（`summary`）とタイトルは、日本語版 Wikipedia の記事から取ったもので、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja) で提供されている。このディレクトリのデータも CC BY-SA 4.0 で提供する。
- 出典は各行の記事で、`https://ja.wikipedia.org/w/index.php?oldid={wikiRevisionId}` が要約を取った時点の版になる。著作者はその版の履歴に載っている執筆者。
- ジャンル（`genres.jsonl` の slug と名前）は、Wikidata の分類（instance of、P31）とその日本語ラベル。Wikidata のデータは [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.ja) で提供されている。
- 画像のファイルは含まない。`imageUrl` は Wikimedia Commons の画像を指し、`imageCredit` にその画像の作者とライセンスを持つ。

## ファイル

- `cards/{page_id を 10 万で割った数}.jsonl`: 1行1カード。`wikiPageId` 順に並べる。1ファイルが GitHub の上限（100MB）を超えないよう、page_id で分ける。
- `genres.jsonl`: ジャンル。Wikidata の ID の数字順に並べる。
- `excluded.jsonl`: カードにしなかった記事と理由。次の取り込みで取り直さないために持つ。
- `rarity-thresholds.json`: レアリティごとの月間閲覧数の下限。最初の取り込みで決まり、以降は変えない。

カードの行は次のキーを持つ。

| キー                | 説明                                                          |
| ------------------- | ------------------------------------------------------------- |
| wikiPageId          | 記事の page_id                                                |
| title               | 記事のタイトル                                                |
| genre               | ジャンルの slug（Wikidata の ID）                             |
| wikiRevisionId      | 要約を取った時点の版 ID                                       |
| wikiFetchedAt       | 要約を取った日時（ISO 8601）                                  |
| summary             | 記事冒頭の要約（REST API の `extract`）                       |
| imageUrl            | 代表画像の URL。使える画像がなければ null                     |
| imageCredit         | 画像の作者とライセンス。画像がなければ null                   |
| rarity              | 取り込んだ時点で決めたレアリティ                              |
| monthlyPageviews    | 直近12か月の月平均閲覧数                                      |
| pageviewsMeasuredAt | 閲覧数を取った日時（ISO 8601）                                |
| isActive            | パックから出すかどうか。止めるときは false にして読み込み直す |

ジャンルの行は `slug`（Wikidata の ID）、`name`（日本語ラベル）、`colorHex`（ID から決めた色）を持つ。除外の行は `wikiPageId`、`title`、`reason` を持つ。

- カードの `isActive` 以外は、取り込んだ時点のまま書き換えない。D1 に入れるときも、すでにあるカードは `isActive` だけを揃える。
