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

## 参考録画に合わせた演出

録画のうちブラウザーとプレイヤーの外枠を除いたゲーム領域を基準に比較する。ローカルの `wiki-collection://openings/opening-juice-reference` は、1組目に通常カードとレジェンドが並ぶ固定の確認用データ。

1. 袋をタップした時を0秒にそろえる。約0.6秒で封を切り、約1.1秒で銀の裏面が画面幅の約78%まで迫る。袋の口より下は見えない。
2. 同じ裏面が縮小しながら左へ移り、背後から2枚目が出る。左右の中心は画面幅の28%と72%、それぞれの幅は約36%。
3. 回転を終えた裏面の右下から左上へ粒子が走り、表が見える。右の公開は左から約1秒後。上位レアでは炎が金色から赤へ変わり、公開後は縁の光が周回する。
4. 公開後のカードをタップし、同じ組の中で前後に移動できることを確認する。閉じると2枚の並びに戻る。保存された5枚を2枚、2枚、1枚の順に確認する。

袋の位置と切り口の座標は `opening-geometry.ts`、銀面の移動・回転・対角ワイプは `opening-stage-card.tsx` にある。`opening-lights.tsx` は時刻に応じて火炎テクスチャのコマを選ぶ。星塵と火炎の素材はアプリ専用に生成したもの。
