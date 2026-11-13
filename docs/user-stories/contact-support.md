# お問い合わせの回答を受け取る

> ステータス: 実装済み

## ストーリー

利用者として、アプリ内で運営に質問し、あとから同じ画面で回答を読みたい。

## 動作確認の手順

1. ローカルで `bun packages/db/src/seed/inquiries-cli.ts` を実行し、`shiro@example.com` でログインする。確認用アカウントの初期パスワードは `password1234`。
2. マイページの「お問い合わせ」で内容を書いて送信する。
   - 送信履歴に「受付済み」と表示される。空白だけでは送信できない。
3. `support-test@example.com` に切り替え、「お問い合わせ」の「未回答のお問い合わせ」を開いて回答する。
   - 回答すると一覧から消える。
4. 最初の利用者に戻り、送信履歴を開く。
   - 自分の問い合わせに「回答済み」と回答本文が表示される。

## データの持ち方

- inquiry が送信者、本文、受付日時、回答、回答日時を保持する。
- support_agent に登録された利用者のみ、未回答一覧の閲覧と回答ができる。

## 対応するテスト

- `packages/api/src/routers/consumer/inquiry/route.integration.test.ts`
- `tests/ios/inquiries.yaml`
