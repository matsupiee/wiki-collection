# 本番へのデプロイ

クラウド上のアプリ環境は `production` を使用する。TestFlight版とApp Store版は同じ本番Workerに接続する。

## 実行方法

リポジトリのルートで実行する。

```sh
bun run deploy
```

このコマンドは `packages/infra/package.json` の `alchemy deploy --stage production` を呼び出す。環境名を省略したAlchemyの既定値に依存しない。別の `--stage` は追加しない。

事前に更新内容を確認するには次を実行する。

```sh
cd packages/infra
bunx alchemy plan --stage production
```

WorkerだけでなくD1のマイグレーションもデプロイ対象に含まれるため、作業中の変更を確認してから実行する。

## 確認方法

デプロイログの環境名が `production` であることと、出力されたWorker URLがEASのproduction環境の `EXPO_PUBLIC_API_URL` と一致することを確認する。デプロイ後はiOSアプリで起動を確認する。

`live_hiromu` は使用しない。`alchemy deploy` を環境指定なしで直接実行すると個人環境が作られるため、通常はルートの `bun run deploy` を使う。ローカル開発用の `dev_hiromu` は本番と分離する。

環境の解決順序は [AlchemyのStages](https://alchemy.run/environments/stages/) を参照。
