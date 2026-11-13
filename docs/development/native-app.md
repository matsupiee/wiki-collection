# Expoアプリの開発

## 構成

`apps/native` にExpo SDK 58、React Native、Expo Routerを配置する。meigen-widgetと同じBun workspaceとMetro標準設定を使う。画面はReact Nativeで描き、WebViewは使わない。

APIは既存のWebサーバーの `/api/auth` と `/api/trpc` を使う。Webの配信サーバーと別にデータベースを作る必要はない。

## 起動

```sh
bun install
bun run dev:local
```

別のターミナルで実行する。

```sh
bun run dev:native:web
```

Expo Webは `http://localhost:8082`。既存のmeigen-widgetの8081と競合しないようにする。APIは `http://localhost:3001`。ポートが使用中の場合は、既存のこのリポジトリのサーバーを利用するか、API URLを変更する。

初回起動でゲストを自動作成する。マイページに表示されたゲスト名を指定して `bun packages/db/src/seed/guest-history-cli.ts ゲスト名` を実行すると、カード1枚と2,000無償ptを付与する。再実行しても重複しない。カードマスターが必要。

## iOS・Android

```sh
bun run --cwd apps/native ios
bun run --cwd apps/native android
```

XcodeまたはAndroid Studioと対応SDKが必要。ネイティブプロジェクトはExpo Prebuildで生成し、git管理しない。依存モジュールを追加したらビルドし直す。

シミュレーターのlocalhostはMacのAPIに接続できる。Androidエミュレーターでは `http://10.0.2.2:3001` を使う。実機では `apps/native/.env` に `EXPO_PUBLIC_API_URL=http://開発PCのLAN-IP:3001` を設定し、APIを `bun run --cwd apps/web dev:local --host 0.0.0.0` で起動する。環境変数を変えたらExpoを再起動する。

SDK 58対応のExpo Goがない環境では、上記のローカル開発ビルドを使う。

## 認証と公開ビルド

アプリのschemeは `wiki-collection`。Better AuthのExpoプラグインをサーバー・クライアントの両方で使い、SecureStore内のCookieをtRPCにも渡す。

iOSでAppleの認証を試すには、App ID `com.matsupiee.wikicollection` のSign in with Apple capabilityを有効にした署名用プロファイルと、Apple Accountでサインインした端末を使う。サーバーはAppleの公開鍵でIDトークンの署名、発行元、有効期限、アプリID、セッションに結びついた一度限りのnonceを検証する。

Expo Webの別オリジンを許可するのは、APIの設定URLがlocalhost / 127.0.0.1の場合だけ。許可するWebポートは8081と8082に限定する。ViteのCORSは無効にし、APIルートでプリフライトと資格情報を含むヘッダーを処理する。本番のブラウザー用CORSを無制限に広げない。

公開ビルドには `EXPO_PUBLIC_API_URL` に本番APIのHTTPS URLを指定する。値はアプリに埋め込まれるため秘密情報を入れない。TestFlight版とApp Store版は同じAPIでptを購入できる。ストア申請・配信はこの変更には含めない。

## 規約ページ

規約本文は `apps/web/src/lib/legal.ts` で管理する。アプリは `expo-web-browser` の `openBrowserAsync` で、APIと同じオリジンの `/legal/…` を開く。iOSはSafariビュー、AndroidはCustom Tabs、開発用Expo Webは別ウィンドウになる。

モジュールを追加しているため、既存の開発ビルドは再ビルドする。API URLのホストでは規約ページも配信する。本文の変更だけならアプリの再ビルドは不要。

旧Web版との比較用 `scripts/native-parity*.mjs` は移行時の記録用で、Webゲーム画面の廃止後は実行対象外。回帰確認には `test:native:e2e` を使う。

## 確認コマンド

```sh
bun run test
bun run --cwd apps/native check-types
bun run --cwd apps/native build
bun run --cwd apps/web check-types
bunx playwright install chromium
bun run test:native:e2e
```

`test:native:e2e` はAPIとExpo Webを起動し、seed済みの環境で実行する。実行ごとに専用の確認アカウントをseedで追加し、そのアカウントだけを操作する。ブラウザー確認は実機のジェスチャーやSecureStoreの検証を代替しない。

## 参照

- [Expoのmonorepo構成](https://docs.expo.dev/guides/monorepos/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Better AuthのExpo連携](https://better-auth.com/docs/integrations/expo)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

- [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)

## 強制アップデートの設定

D1のマイグレーションとAPIを先にリリースし、判定機能を含むアプリを配信する。最低バージョンの初期設定は空。ストアで更新先をダウンロードできるようになったら、対象環境のD1で最低バージョンを設定する。次はiOSで1.2.0を必須にする例。

```sql
INSERT INTO app_update_policy (platform, minimum_version) VALUES ('ios', '1.2.0')
ON CONFLICT (platform) DO UPDATE SET minimum_version = excluded.minimum_version;
```

Androidは `android` を指定する。バージョンはストアの表示バージョンで、数字をピリオドで区切った1〜3要素を使う。解除するには対象OSの行を削除する。判定機能を導入する前に配信したバイナリには更新画面を表示できない。
