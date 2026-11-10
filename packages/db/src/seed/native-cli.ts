// 既存データをリセットせず、ネイティブ/Web共通の確認アカウントを追加する。
import { eq } from "drizzle-orm";
import { card, cardDiscovery, coinDeposit, user, userCard } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";
const { db, dispose } = await openLocalDb();
const prefix = process.env.NATIVE_SEED_PREFIX ?? "native";
try {
  const cards = await db.select({ id: card.id }).from(card).orderBy(card.wikiPageId).limit(9);
  if (cards.length < 2)
    throw new Error("確認用に2種類以上のカードが必要です。先にマスターを取り込んでください。");
  for (const [index, name] of ["アオイ", "アカネ"].entries()) {
    const email = `${prefix}${index + 1}@example.com`;
    const [existing] = await db.select().from(user).where(eq(user.email, email));
    const userId = existing?.id ?? (await createUser(db, name, email));
    if (!existing) {
      for (const c of cards) {
        await db.insert(userCard).values({ userId, cardId: c.id });
        await db
          .insert(cardDiscovery)
          .values({ userId, cardId: c.id, firstAcquiredAt: new Date() });
      }
    }
    const id = `native-seed-credit-${userId}`;
    await db
      .insert(coinDeposit)
      .values({ id, userId, source: "admin_grant", amount: 2000, isPaid: false })
      .onConflictDoNothing();
  }
  console.log(
    `${prefix}1@example.com / ${prefix}2@example.com、password1234。既存の利用者・所持品は変更しません。`,
  );
} finally {
  await dispose();
}
