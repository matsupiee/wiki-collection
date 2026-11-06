# カードの能力値と弱点を見る

> ステータス: 実装済み

## ストーリー

プレイヤーとして、カードの攻撃力・防御力・属性・弱点を確認してチームを選びたい。

## 動作確認の手順

1. `bun run db:seed:battle` を実行し、`battle1@example.com` / `password1234` でログインする。
2. コレクションからカード詳細を開く。
   - 基本攻撃力が月間閲覧数、基本防御力が記事ソースのバイト数として表示される。
   - 属性と弱点が表示される。人物の記事は「人物」、プログラミング言語は「科学技術」、映画は「文化」、国は「社会」、生物は「自然」となる。
3. 対戦画面を開く。
   - 同じ所持カードの能力値には、その1枚に加算された強化値が含まれる。
   - → [カード合成](./fuse-cards.md)
4. 出品されたカードの詳細を開く。
   - 購入対象の1枚の強化を含めた能力値を確認できる。

## データの持ち方

- `card.monthly_pageviews` が基本攻撃力、`card.article_length` が基本防御力。
  - 記事ソースのバイト数は MediaWiki API から取得する。要約の長さは使わない。
  - 既存の未計測データは `wiki:lengths` と `wiki:load` で補完する。未計測時は「未計測」と表示し、編成・合成対象にはしない。
- 属性は `genre.slug` のWikidata分類IDから共有の対応表で決める。記事IDやタイトルでは決めない。
  - 人物・自然・科学技術・社会・文化の5属性。未知の分類は総合で、相性倍率はない。
  - 人物 → 文化 → 社会 → 科学技術 → 自然 → 人物の順に弱点を突く。対戦画面の「能力値と対戦ルール」で各相性の説明を読める。
  - コレクション、詳細、所持品選択、マーケット、日次対戦で同じ判定を使う。
  - 実在の人物や記事内容の評価を表すものではない。

## 対応するテスト

- `packages/api/src/routers/consumer/battle/*/handler.integration.test.ts`
- `packages/wiki-import/src/import-cards.test.ts`
- `packages/wiki-import/src/backfill-lengths.test.ts`
- `packages/wiki-import/src/load-cards.integration.test.ts`
