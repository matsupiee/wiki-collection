# Wikipedia の記事をカードとして取り込む

> ステータス: カードのファイルへの取り込みと、ローカルの D1 への読み込みは実装済み。本番の D1 への読み込みは未実装。

## ストーリー

運営者として、ジャンルごとのカテゴリから Wikipedia の記事を集めて、カードとしてまとめて追加したい。
1枚ずつ手で作らずに済み、カードにしにくい記事は自動で外れるので、少ない手間でカードを増やせる。
取り込んだ結果は git の差分で確かめられるので、外し漏れた記事を D1 に入る前に見つけられる。

## 動作確認の手順

手順2と3は Wikipedia の API に接続できる環境で行う。

1. `bun run db:seed` を実行する。
   - サンプルのカード 60 枚と、6 つのジャンルが D1 に入る。
2. `bun run wiki:import --genre space --max 30` を実行する。
   - 宇宙ジャンルのカテゴリ「天文学」とその1段下のサブカテゴリから、最大 30 件の記事を調べる。
   - 追加したカードと、除外した記事とその理由が一覧で出る。
   - 曖昧さ回避、一覧記事、事件・事故、要約が短い記事はカードにならない。
   - 存命の人物の記事はカードになる。
   - D1 には書かない。`packages/wiki-import/data/ja/cards/space.jsonl` に、追加したカードが1行ずつ `wikiPageId` 順に入る。
   - 初めての取り込みでは、取り込んだ記事の閲覧数の順位から下限が決まる。「レアリティの下限を決めました」と下限の値が出て、`packages/wiki-import/data/ja/rarity-thresholds.json` に書かれる。
3. もう一度同じコマンドを実行する。
   - JSONL にある記事は取り直さず、追加されない。
   - 下限は決め直さず、`rarity-thresholds.json` の値でレアリティを決める。
   - `git diff` に出るのは、新しく足したカードの行だけになる。
4. `bun run wiki:load` を実行する。
   - JSONL のカードがローカルの D1 に入り、「カード N 枚を入れました。レアリティの下限も入れました」と出る。
   - もう一度実行しても、カードは増えない。
5. `bun run dev:local` で起動し、hanako@example.com でコレクションの図鑑を開く。
   - 宇宙ジャンルの総数が、seed の 10 枚に取り込んだ枚数を足した数になる。
6. 取り込んだカードを手に入れたユーザーでカード詳細を開く。
   - 要約は記事冒頭の文章になっている。
   - 出典の行に「取り込んだ時点の版」のリンクが出て、押すとその版の記事が開く。
   - 画像があるカードは、作者とライセンス（Wikimedia Commons）が出る。画像が使えない記事は、ジャンルの色とタイトルの1文字目で絵柄が出る。
   - → [集めたカードと図鑑を見る](./collection-and-dex.md)
7. JSONL のカードを1行選んで `isActive` を false にし、`bun run wiki:load` を実行する。
   - そのカードはパックから出なくなる。所持済みのカードは残る。
   - 要約やレアリティを書き換えても、D1 のカードは変わらない。

## データの持ち方

- `packages/wiki-import/data/ja/cards/{slug}.jsonl`: 取り込んだ記事1件につき1行。git で管理する正のデータ。
  - 要約、版、閲覧数、レアリティは取り込んだ時点で固定する。書き換えてよいのは `isActive` だけ。
  - 要約は CC BY-SA 4.0 なので、同じディレクトリの `README.md` にデータのライセンスと出典を書いてある。
- `packages/wiki-import/data/ja/rarity-thresholds.json`: レアリティごとの月間閲覧数の下限。最初の取り込みで決める。
- `card`: `wiki:load` で JSONL から入れる。
  - `(wikiLang, wikiPageId)` の unique 制約で、同じ記事を二重にカードにしない。
  - `wikiRevisionId` と `wikiFetchedAt` に、要約を取った時点の版と日時を持つ。CC BY-SA の帰属表示に使う。
- `rarity_threshold`: `wiki:load` で `rarity-thresholds.json` の値を入れる。

## 対応するテスト

- `packages/wiki-import/src/import-cards.test.ts`: Wikimedia の API を模した応答で、除外、画像のライセンス判定、下限の決定、JSONL への書き込み、2回目の取り込みを確かめる。
- `packages/wiki-import/src/load-cards.integration.test.ts`: JSONL を D1 に入れること、何度実行しても同じ状態になること、`isActive` だけを揃えること、ジャンルがないときに何も入れないことを確かめる。
- `packages/wiki-import/src/card-store.test.ts`: 形の合わない行を、ファイル名と行番号付きのエラーにすることを確かめる。
- `packages/wiki-import/src/wikimedia-client.test.ts`: User-Agent、再試行、同時リクエスト数の上限を確かめる。
- `packages/api/src/routers/consumer/card/get/handler.integration.test.ts`: 版へのリンクを返すことを確かめる。
