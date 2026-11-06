# 規約類を確認する

> ステータス: 実装済み。運営者情報は仮置きで、公開前の確認が必要。

## ストーリー

利用者として、アプリのメニューから最新の規約や支払いに関する表示を確認し、読んだ後に元の画面へ戻りたい。

## 動作確認の手順

1. `bun run dev:local` と `bun run dev:native:web` を起動し、`bun run db:seed:native` で確認用利用者を作る。
   - Web規約だけの確認にはseedもログインも不要。
2. Webの `/` を未ログインで開き、4つのリンクを順に開く。
   - 利用規約、プライバシーポリシー、特定商取引法に基づく表記、資金決済法に基づく表示の本文と更新日が読める。
   - 一覧に戻れる。ゲーム画面・ログイン画面の旧URLは404になる。
3. アプリにログインし、マイページの4つの規約メニューを順に押す。
   - Webの `/legal/terms`、`/legal/privacy`、`/legal/tokushoho`、`/legal/payment-services` がアプリ内ブラウザで開く。
   - 閉じるとマイページに戻り、ログイン状態を維持する。
   - 開発用Expo Webでは別ウィンドウが開く。
4. ポイント購入画面の特定商取引法・資金決済法のリンクも開く。
   - 同じWebページを開き、閉じると購入画面に戻る。
5. iOS・Androidの実機でも3、4を確認する。
   - iOSはSafariビュー、AndroidはCustom Tabsで表示する。

## データの持ち方

- 本文は `apps/web/src/lib/legal.ts` だけに保持する。ネイティブアプリには本文や規約画面を持たない。
- URLは `EXPO_PUBLIC_API_URL` のオリジンと `/legal/…` から作る。APIと規約ページは同じWebサーバーで提供する。
- 確認用データは `packages/db/src/seed/native-cli.ts` を再利用する。

## 対応するテスト

- `tests/native/legal-web.spec.ts`: 未ログインでの全規約の表示、一覧への遷移、旧画面の404。
- `tests/native/app.spec.ts`: アプリのマイページ・購入画面からの全リンク、復帰後の操作。
- `bun run test`: 全ストーリーに対応するAPI・共通ロジックの回帰確認。
