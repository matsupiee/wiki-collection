# 無料パックの枠

> ステータス: 実装済み

## ストーリー

ユーザーとして、アプリを閉じている間も無料枠が回復し、貯まった分をまとめて開けたい。

## 動作確認の手順

1. `bun run db:seed` 後、`taro@example.com` でログインする。
   - 初期残数は10。1パック開けると残り9になり、次の回復までの時間が表示される。
2. `shiro@example.com` でログインし、`bun packages/db/src/seed/free-pack-cli.ts` を実行してパック画面を開き直す。
   - 残り0では開封できない。15秒後に残り1になり、そのまま基本パックを開ける。
3. 回復直後に1パック開け、100分待って再度パック画面を開く。
   - 残り10になり、それ以上待っても10を超えない。満杯から開封すると、新たに10分のカウントダウンが始まる。

## データの持ち方

- `free_pack_allowance.fullAt` に満杯まで回復する時刻を保存する。
  - 開封で10分延びる。回復途中で開封しても次の回復時刻は変わらない。

## 対応するテスト

- `packages/api/src/routers/consumer/pack/open/handler.integration.test.ts` で10分の境界、上限、同時開封、日付をまたぐ回復を確認する。
- `packages/api/src/routers/consumer/pack/list/handler.integration.test.ts` で初期残数と満杯時の表示用データを確認する。
