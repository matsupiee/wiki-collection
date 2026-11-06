import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  await seedBattle(db, "element-icons");
  console.log(
    "属性アイコン確認用: element-icons1@example.com / element-icons2@example.com、password1234。既存利用者の所持品は変更しません。",
  );
} finally {
  await dispose();
}
