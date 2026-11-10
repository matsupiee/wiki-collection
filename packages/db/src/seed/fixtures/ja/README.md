# ローカル開発用の実記事500件

## ライセンス

このディレクトリのデータは、リポジトリのほかのファイルとはライセンスが違う。

- 要約（`summary`）とタイトルは、日本語版 Wikipedia の記事から取ったもので、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja) で提供されている。このディレクトリのデータも CC BY-SA 4.0 で提供する。
- 出典は各行の記事で、`https://ja.wikipedia.org/w/index.php?oldid={wikiRevisionId}` が要約を取った時点の版になる。著作者はその版の履歴に載っている執筆者。
- ジャンル（`genres.jsonl` の slug と名前）は、Wikidata の分類（instance of、P31）とその日本語ラベル。Wikidata のデータは [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.ja) で提供されている。
- 画像のファイルは含まない。`imageUrl` は Wikimedia Commons の画像を指し、`imageCredit` にその画像の作者とライセンスを持つ。画像を R2 に複製しても、ここにある元 URL と帰属情報は書き換えない。
