import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";
const { db, dispose } = await openLocalDb();
try {
  await seedBattle(db, "fusion-bulk", { fusionMaterials: true });
  console.log(
    "一括強化確認: fusion-bulk1@example.com / fusion-bulk2@example.com、password1234。各2種類の未強化5枚と強化済み1枚を含む専用データ。既存データは変更しません。",
  );
} finally {
  await dispose();
}
