# ネイティブ版の回帰確認

2026年11月6日の実装時に確認した範囲。環境と実行手順は [native-app.md](./native-app.md) を参照。

## 実行した確認

- `bun run test`: API 86件、Wikipedia取り込み29件、Webロジック9件、ネイティブ共通ロジック2件。
- `bun run check-types`: 全8パッケージの型チェック。Webビルドを含む。
- `bun run test:native:e2e`: 独立したChromiumで認証、開封・再開、並べ替え、2利用者間の売買・入札、pt購入、履歴、規約、ログアウトを操作する。
- Expo Webの書き出し、iOS・Android向けHermesバンドルの書き出し。
- iOSシミュレーター向けXcodeビルドと、アプリのログイン画面表示。

iOS実機とAndroid実機での一連の操作、ストア配信、実課金は確認対象外。WebとReact Nativeでは描画・アニメーションの実装が異なるため、ピクセル単位の一致は保証しない。

## 既存ストーリーとの対応

以下は全ストーリーの回帰確認範囲。API欄は `packages/api/src/routers/consumer/` 配下の統合テストを指す。サーバー処理はWeb版とネイティブ版で共通。

| ストーリー                                                          | 実行した確認                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [無料開封](../user-stories/open-free-pack.md)                       | pack/open、pack/get、pack/list、ブラウザーで5枚表示                                                 |
| [無料枠](../user-stories/free-pack-allowance.md)                    | pack/open、pack/get、pack/listの日付・残数のテスト                                                  |
| [有料開封](../user-stories/open-premium-pack.md)                    | pack/open、残高不足と無償pt優先消費                                                                 |
| [開封再開](../user-stories/resume-opening.md)                       | opening/get、opening/reveal、opening/list、ブラウザーでリロード後に同一開封を再開                   |
| [コレクション](../user-stories/collection.md)                       | card/list-owned、card/get、ブラウザーで一覧                                                         |
| [並べ替え](../user-stories/sort-collection.md)                      | card/list-owned、ブラウザーで閲覧数順・記事サイズ順                                                 |
| [オークション](../user-stories/market-auction.md)                   | market/bid、get、list-mine、入札後の取り下げ不可をブラウザー確認                                    |
| [pt購入](../user-stories/buy-coins.md)                              | shop/purchase、shop/list-products、ブラウザーで開発用購入                                           |
| [pt履歴](../user-stories/coin-history.md)                           | coin/list-history、coin/get-balance、ブラウザーで履歴表示                                           |
| [Wikipedia取り込み](../user-stories/import-cards-from-wikipedia.md) | wiki-importの全29件とtest/wiki-seed.integration.test.ts                                             |
| [画像保存](../user-stories/store-card-images.md)                    | wiki-import/mirror-images.test.ts、shared/card/serve-image.integration.test.ts                      |
| [規約](../user-stories/legal-pages.md)                              | 4文書をWeb・ネイティブで表示。本文は共有データから描画                                              |
| [ネイティブ](../user-stories/native-app.md)                         | native-auth.integration.test.ts、CORS、共通選択ロジック、ブラウザー操作、プラットフォーム別バンドル |

## 見た目を合わせた後の確認

[比較レビュー記録](./native-parity-review.md) に15回の指摘と修正、表示幅ごとの確認を記録した。`tests/native/app.spec.ts` はWebと同じ初期登録画面、選択メニュー、出品の直接送信に追随し、3シナリオすべて成功した。

## iOS Liquid Glassタブの確認

2026年11月6日、[Expo公式のNative Tabs](https://docs.expo.dev/router/advanced/native-tabs/)に従ってiOSのメイン5タブを変更した。内容の下端とヘルプボタンは `react-native-screens/experimental` のSafeAreaViewで保護し、ルート側の下部余白と二重にならないようにした。

- `bun run test`: API 86件、取り込み29件、Webロジック9件、ネイティブロジック2件が成功。
- `bun run --cwd apps/native check-types`: 成功。
- `bun run test:native:e2e`: Chromiumの3シナリオが成功。
- iOS向けHermesバンドルの書き出し: 成功。
- iPhone 18 Pro / iOS 27.0シミュレーター: Liquid Glass描画、5タブの遷移、パック画面下部の重なり解消を確認。

iOS 26実機・旧iOS・Android実機の描画は未確認。この時点では詳細画面にカスタムタブを使用していた。API・課金・個人情報の取り扱いは変わらないため、利用規約・プライバシーポリシー・特定商取引法等の表記の更新は不要と判断した。

2026年11月10日、詳細画面と開封結果を各タブのスタックに移した。iPhone 17e / iOS 27.0シミュレーターで開封履歴から開封結果、カード詳細へ進み、各画面にOS標準タブが表示されることを確認した。ログイン済みのシミュレーターで `maestro test tests/ios/liquid-glass-tabs.yaml` を実行すると、履歴とポイント購入からのタブ切り替えを確認できる。
