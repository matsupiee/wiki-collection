# Wikipedia の記事をカードとして取り込む

> ステータス: 上位の一覧づくり、カードのファイルへの取り込み、ローカルの D1 への読み込みは実装済み。本番の D1 への読み込みは未実装。

## ストーリー

運営者として、日本語版 Wikipedia でよく読まれている記事の上位 10 万件を、カードとしてまとめて追加したい。
ジャンルは記事に紐づく Wikidata の分類をそのまま使うので、こちらでジャンルを考えたり、記事を振り分けたりしなくて済む。
カードにしにくい記事は自動で外れ、取り込んだ結果は git の差分で確かめられるので、外し漏れた記事を D1 に入る前に見つけられる。

## 動作確認の手順

手順2と3は Wikimedia の dump と API に接続できる環境で行う。手順2は dump（1か月で数 GB）を読むので、時間がかかる。

1. `bun run db:seed` を実行する。
   - サンプルのカード 60 枚と、26 個のサンプルのジャンルが D1 に入る。
2. `bun run wiki:top` を実行する。
   - 直近1か月（今月を除く）の閲覧数の dump を読み、日本語版の行数が出る。
   - `--months 3` を付けると直近3か月分を読み、3か月の月平均で並べる。
   - `packages/wiki-import/.cache/top-pages-ja.tsv` に、page_id と月平均閲覧数が多い順に 10 万行書かれる。git には入らない。
3. `bun run wiki:import --limit 30` を実行する。
   - 上位の一覧の上から 30 件を調べる。追加したカードとそのジャンル、除外した記事とその理由が一覧で出る。
   - ジャンルは Wikidata の分類の日本語名になる（例: 人間、テレビドラマ、山）。
   - 記事以外のページ、曖昧さ回避、一覧記事、事件・事故、要約が短い記事、Wikidata の分類がない記事はカードにならない。
   - 存命の人物の記事はカードになる。
   - D1 には書かない。`packages/wiki-import/data/ja/` の次のファイルに書く。
     - `cards/{page_id を 10 万で割った数}.jsonl`: 追加したカードが1行ずつ `wikiPageId` 順に入る。
     - `genres.jsonl`: 初めて出てきた分類がジャンルとして入る。
     - `excluded.jsonl`: 除外した記事と理由が入る。
   - 初めての取り込みでは、上位の一覧全体の閲覧数の順位から下限が決まる。「レアリティの下限を決めました」と下限の値が出て、`rarity-thresholds.json` に書かれる。
4. もう一度同じコマンドを実行する。
   - カードにした記事と除外した記事は取り直さず、一覧の次の 30 件を調べる。
   - 下限は決め直さず、`rarity-thresholds.json` の値でレアリティを決める。
   - `git diff` に出るのは、新しく足した行だけになる。
5. `bun run wiki:load` を実行する。
   - ジャンル、カード、下限がローカルの D1 に入り、「ジャンル N 個、カード N 枚を入れました。レアリティの下限も入れました」と出る。
   - もう一度実行しても、カードは増えない。
6. `bun run dev:local` で起動し、hanako@example.com でコレクションの図鑑を開く。
   - 総数が、seed の 60 枚に取り込んだ枚数を足した数になる。
   - 「すべてのジャンルを見る」を押すと、取り込んだ分類のジャンルが出る。
   - → [集めたカードと図鑑を見る](./collection-and-dex.md)
7. 取り込んだカードを手に入れたユーザーでカード詳細を開く。
   - 要約は記事冒頭の文章になっている。ジャンルは Wikidata の分類の名前になっている。
   - 出典の行に「取り込んだ時点の版」のリンクが出て、押すとその版の記事が開く。
   - 画像があるカードは、作者とライセンス（Wikimedia Commons）が出る。画像が使えない記事は、ジャンルの色とタイトルの1文字目で絵柄が出る。
8. JSONL のカードを1行選んで `isActive` を false にし、`bun run wiki:load` を実行する。
   - そのカードはパックから出なくなる。所持済みのカードは残る。
   - 要約、ジャンル、レアリティを書き換えても、D1 のカードは変わらない。

## データの持ち方

- `packages/wiki-import/.cache/top-pages-ja.tsv`: 閲覧数の上位の一覧。dump から作り直せるので git に入れない。
- `packages/wiki-import/data/ja/`: git で管理する正のデータ。
  - `cards/*.jsonl`: 取り込んだ記事1件につき1行。要約、版、閲覧数、ジャンル、レアリティは取り込んだ時点で固定する。書き換えてよいのは `isActive` だけ。
  - `genres.jsonl`: Wikidata の分類。slug は Wikidata の ID、名前は初めて出てきたときの日本語ラベル。
  - `excluded.jsonl`: 除外した記事。次の取り込みで取り直さない。
  - `rarity-thresholds.json`: レアリティごとの月間閲覧数の下限。最初の取り込みで決める。
  - 要約は CC BY-SA 4.0 なので、同じディレクトリの `README.md` にデータのライセンスと出典を書いてある。
- `genre`、`card`、`rarity_threshold`: `wiki:load` でファイルから入れる。
  - `card` は `(wikiLang, wikiPageId)` の unique 制約で、同じ記事を二重にカードにしない。
  - `card.wikiRevisionId` と `wikiFetchedAt` に、要約を取った時点の版と日時を持つ。CC BY-SA の帰属表示に使う。

## 対応するテスト

- `packages/wiki-import/src/top-pages.test.ts`: dump の日本語版の行を page_id ごとに足し、月平均の多い順に並べること、bz2 を展開して読むことを確かめる。
- `packages/wiki-import/src/import-cards.test.ts`: Wikimedia の API と Wikidata の SPARQL を模した応答で、分類の選び方、除外、画像のライセンス判定、下限の決定、ファイルへの書き込み、2回目の取り込みを確かめる。
- `packages/wiki-import/src/load-cards.integration.test.ts`: ファイルを D1 に入れること、ジャンルの並び順、何度実行しても同じ状態になること、`isActive` だけを揃えること、ジャンルがないときに何も入れないことを確かめる。
- `packages/wiki-import/src/card-store.test.ts`: 形の合わない行を、ファイル名と行番号付きのエラーにすることを確かめる。
- `packages/wiki-import/src/wikimedia-client.test.ts`: User-Agent、再試行、同時リクエスト数の上限を確かめる。
- `packages/api/src/routers/consumer/card/get/handler.integration.test.ts`: 版へのリンクを返すことを確かめる。
