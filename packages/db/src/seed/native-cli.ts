// 既存データをリセットせず、ネイティブ/Web共通の確認アカウントを追加する。
import { eq } from "drizzle-orm";
import { coinDeposit, user } from "../schema";
import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";
const { db, dispose } = await openLocalDb();
const prefix = process.env.NATIVE_SEED_PREFIX ?? "native";
try {
  await seedBattle(db, prefix, { fusionMaterials: true });
  for (const email of [`${prefix}1@example.com`, `${prefix}2@example.com`]) {
    const [account] = await db.select().from(user).where(eq(user.email, email));
    const id = `native-seed-credit-${account!.id}`;
    await db
      .insert(coinDeposit)
      .values({ id, userId: account!.id, source: "admin_grant", amount: 2000, isPaid: false })
      .onConflictDoNothing();
  }
  console.log(
    `${prefix}1@example.com / ${prefix}2@example.com、password1234。既存の利用者・所持品は変更しません。`,
  );
} finally {
  await dispose();
}
