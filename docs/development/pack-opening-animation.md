# 開封演出の開発と確認

## スキルと設計

- [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/main/skills/disciplines/game-feel) を `~/.codex/skills/game-feel` に導入した。
- [Expo公式 expo-animation](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-animation) を `~/.codex/skills/expo-animation` に導入した。
- [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) と [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) の手順でSDK対応バージョンを導入する。ネイティブモジュール追加後はiOSアプリを再ビルドする。
- ジェスチャーと粒子はUIスレッドの共有値で更新する。袋とカードの座標は同じ時刻から計算し、公開が終わると操作を有効にする。
- 抽選や消費は既存APIで確定する。演出は保存済み結果を読むだけで、演出の中断やスキップで引き直さない。

## 確認用データ

```sh
bun packages/db/src/seed/opening-juice-cli.ts ゲスト名
```

iOSアプリのマイページに表示されるゲスト名を指定する。全レアリティの既存マスターが必要。利用者別の固定IDで8つの開封を作り、再実行で所持カードを増やさない。既存の利用者・開封・結果は変更しない。コマンドが出力するリンクと `OPENING_PREFIX` を使う。引数なしは旧メール認証用データを保守するための互換動作で、現在のiOSアプリではゲスト名を指定する。

```sh
xcrun simctl openurl <シミュレーターUDID> <seedが出力したall-raritiesのリンク>
maestro --udid <シミュレーターUDID> test -e OPENING_PREFIX=<seedの出力値> tests/ios/opening-juice.yaml
```

初回のディープリンクにOSの確認が出る場合は「開く」で進める。開発用アプリが別のMetroを参照する場合は、起動先を確認する。8082の設定例:

```sh
xcrun simctl terminate booted com.matsupiee.wikicollection
xcrun simctl spawn booted defaults write com.matsupiee.wikicollection RCT_jsLocation -string localhost:8082
xcrun simctl launch booted com.matsupiee.wikicollection
```

## 2026年11月14日の確認範囲

全ストーリーの既存自動回帰として `bun run test` の182件（認証1件、API129件、取り込み41件、Web3件、ネイティブ8件）が成功した。8パッケージの型チェックと `bun run test:native:e2e` の5シナリオも成功した。ブラウザーE2Eは既存業務フローの確認であり、iOS演出確認の代替ではない。

確認用seedは現在のゲスト名を指定して実行できる。実行後に8開封・40枚ができること、再実行の前後で旧データを含む16開封・80所持カード・80結果行の全列が変わらないことを確認した。

今回のiOS確認は iPhone 17 / iOS 27.0 シミュレーターの開発ビルドで行った。`opening-juice.yaml` と `opening-gesture.yaml` が成功し、封のタップ・短いドラッグ・縦ドラッグでは開かないこと、横方向に切る操作、5枚の公開、詳細の前後移動と復帰、最後のカードから結果へ進む操作、スキップ、もう1パックを確認した。設定アプリで「視差効果を減らす」を有効にして `opening-reduced-motion.yaml` も成功し、5枚の公開、明るい背景の詳細画面と復帰、結果への移動を確認した。確認後は設定を元の無効に戻した。`opening-carousel.yaml` で200msの左右連続ドラッグが選択を起こさないことと、左右端の袋をタップすると封を切る画面へ進めることも確認した。実機は接続されておらず、今回の変更ではReleaseビルドを確認していない。触覚の強さ・同期と、最も遅い対応端末での性能は未確認。

料金・提供割合・個人情報・外部送信・売買条件は変わらない。共有の規約4文書を確認し、この演出変更に伴う本文更新は不要と判断した。

## iOS描画の調整

連続ドラッグ時に隣の袋のタップとして選択される問題を確認した。パック選択中のPan検知を袋全体の親に移し、ドラッグしたタッチでは選択を抑えることで、左右の袋にまたがる操作をiOSアプリで再確認した。

箔のSVGを `perspective` と `rotateY` で変形した横の袋が、iOSシミュレーターで表示されなかった。共有値は待機時刻と登場完了値になっており、寸法と重なり順だけを変えても解消しなかった。投影変形を外すと表示されたため、横の袋の奥行きは `scaleX` と縮小率で表現する。OSの不具合とは断定していない。

- [Apple clipsToBounds](https://developer.apple.com/documentation/uikit/uiview/clipstobounds)
- [React Native transforms](https://reactnative.dev/docs/transforms)

詳細表示時のステータスバーは、子の `StatusBar` を白文字にしても黒文字のままだった。詳細画面も開封画面と同じ明るい背景・濃色文字に揃え、ステータスバーと安全領域内の閉じる操作の可読性をiOSアプリで確認した。

- [Apple TN3105](https://developer.apple.com/documentation/technotes/tn3105-customizing-uistatusbar-style)
- [Expo Router Stack](https://docs.expo.dev/router/advanced/stack/)

## 過去の確認

以前の黒背景の演出では、iPhone 18 Pro / iOS 27.0シミュレーターの開発ビルドと署名付きReleaseビルドで、5枚の公開、詳細移動と復帰、スキップ、部分スワイプ、もう1パック、存在しない開封IDからの復帰とReduce Motionを確認した。この記録は今回の変更後のRelease検証を示すものではない。

## 写真の表示順

固定結果では4段階のレアリティを順に確認できる。写真の重なりとめくりの動きは `opening-photo.tsx` で調整する。短いドラッグからの復帰、左右へのスワイプ、タップ、5枚目から結果への移動を確認する。

iPhone 17e / iOS 27.0シミュレーターで、短いスワイプから元に戻ること、長いスワイプで1枚進むこと、詳細を閉じて同じ位置から続けられることを確認した。残りの写真を順にタップして5枚目から結果へ進む操作と、開封前のスキップも確認した。
