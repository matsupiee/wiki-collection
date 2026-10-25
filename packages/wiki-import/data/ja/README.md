# 日本語版 Wikipedia から取り込んだカード

`bun run wiki:import` が書き足し、`bun run wiki:load` が D1 に入れる。手順は [database.md](../../../../docs/design/database.md) の「Wikipedia からのカード作成」を参照。

## ライセンス

このディレクトリのデータは、リポジトリのほかのファイルとはライセンスが違う。

- 要約（`summary`）とタイトルは、日本語版 Wikipedia の記事から取ったもので、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja) で提供されている。このディレクトリのデータも CC BY-SA 4.0 で提供する。
- 出典は各行の記事で、`https://ja.wikipedia.org/w/index.php?oldid={wikiRevisionId}` が要約を取った時点の版になる。著作者はその版の履歴に載っている執筆者。
- 画像のファイルは含まない。`imageUrl` は Wikimedia Commons の画像を指し、`imageCredit` にその画像の作者とライセンスを持つ。

## ファイル

- `cards/{ジャンルの slug}.jsonl`: 1行1カード。`wikiPageId` 順に並べる。
- `rarity-thresholds.json`: レアリティごとの月間閲覧数の下限。最初の取り込みで決まり、以降は変えない。

カードの行は次のキーを持つ。

| キー                | 説明                                                          |
| ------------------- | ------------------------------------------------------------- |
| wikiPageId          | 記事の page_id                                                |
| title               | 記事のタイトル                                                |
| wikiRevisionId      | 要約を取った時点の版 ID                                       |
| wikiFetchedAt       | 要約を取った日時（ISO 8601）                                  |
| summary             | 記事冒頭の要約（REST API の `extract`）                       |
| imageUrl            | 代表画像の URL。使える画像がなければ null                     |
| imageCredit         | 画像の作者とライセンス。画像がなければ null                   |
| rarity              | 取り込んだ時点で決めたレアリティ                              |
| monthlyPageviews    | 直近12か月の月平均閲覧数                                      |
| pageviewsMeasuredAt | 閲覧数を取った日時（ISO 8601）                                |
| isActive            | パックから出すかどうか。止めるときは false にして読み込み直す |

- `isActive` 以外は、取り込んだ時点のまま書き換えない。D1 に入れるときも、すでにあるカードは `isActive` だけを揃える。
