# お問い合わせ担当者の設定

対象環境にマイグレーションを適用してから、運営用アカウントの利用者IDを確認する。D1管理者が次のSQLで担当者を登録する。`<user-id>` は確認したIDに置き換える。

```sql
INSERT INTO support_agent (user_id) VALUES ('<user-id>');
```

担当を外すときは同じIDを指定する。次回の一覧取得と回答送信から権限の変更が反映される。

```sql
DELETE FROM support_agent WHERE user_id = '<user-id>';
```
