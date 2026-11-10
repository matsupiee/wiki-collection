# 開封演出の開発と確認

## スキルと設計

- [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/main/skills/disciplines/game-feel) を `~/.codex/skills/game-feel` に導入した。
- [Expo公式 expo-animation](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-animation) を `~/.codex/skills/expo-animation` に導入した。
- [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) と [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) の手順でSDK対応バージョンを導入する。ネイティブモジュール追加後はiOSアプリを再ビルドする。
- ジェスチャーと粒子はUIスレッドの共有値で更新する。袋とカードの座標は同じ時刻から計算し、公開が終わると操作を有効にする。
- 抽選や消費は既存APIで確定する。演出は保存済み結果を読むだけで、演出の中断やスキップで引き直さない。

## 確認用データ

```sh
bun run db:seed:opening
```

`opening-juice1@example.com` / `password1234` でログインする。全レアリティの既存マスターが必要。固定IDの4つの開封を作り、再実行で所持カードを増やさない。既存の利用者・開封を削除しない。

```sh
xcrun simctl openurl booted wiki-collection://openings/opening-juice-all-rarities
maestro --udid <シミュレーターUDID> test tests/ios/opening-juice.yaml
```

初回のディープリンクにOSの確認が出る場合は「開く」で進める。開発用アプリが別のMetroを参照する場合は、起動先を確認する。8082の設定例:

```sh
xcrun simctl terminate booted com.matsupiee.wikicollection
xcrun simctl spawn booted defaults write com.matsupiee.wikicollection RCT_jsLocation -string localhost:8082
xcrun simctl launch booted com.matsupiee.wikicollection
```

## 確認範囲

既存ストーリー全体の回帰として `bun run test`（API 86件、取り込み29件、Web 3件、ネイティブ2件）と `bun run test:native:e2e`（4シナリオ）を実行した。全8パッケージの型チェックも成功。ブラウザーE2Eは既存業務フローの確認であり、iOS演出確認の代替ではない。

iPhone 18 Pro / iOS 27.0シミュレーターで開発ビルドと署名付きReleaseビルドを確認した。Maestroで全5枚の公開、同じ組の詳細移動と復帰、スキップ、部分スワイプと全スワイプ、もう1パック、存在しない開封IDからの復帰を確認した。`tests/ios/opening-gesture.yaml` の座標はこの端末用。OSのReduce Motionを有効にした状態でも5枚と結果・スキップを確認した。

iOS実機は接続されていない。触覚の強さ・同期と最も遅い対応端末のリリースビルドでの性能は未確認。

料金・提供割合・個人情報・外部送信・売買条件は変わらない。共有の規約4文書を確認し、この演出変更に伴う本文更新は不要と判断した。

## 写真の表示順

固定結果では5段階のレアリティを順に確認できる。写真の重なりとめくりの動きは `opening-photo.tsx` で調整する。短いドラッグからの復帰、左右へのスワイプ、タップ、5枚目から結果への移動を確認する。

iPhone 17e / iOS 27.0シミュレーターで、短いスワイプから元に戻ること、長いスワイプで1枚進むこと、詳細を閉じて同じ位置から続けられることを確認した。残りの写真を順にタップして5枚目から結果へ進む操作と、開封前のスキップも確認した。
