import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  await seedBattle(db, "stat-icons", { fusionMaterials: true });
  console.log(
    "能力値アイコン確認用: stat-icons1@example.com / stat-icons2@example.com、password1234。強化済みカードと合成素材を含みます。",
  );
} finally {
  await dispose();
}
