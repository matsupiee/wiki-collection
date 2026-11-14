import { recordSeedGrants } from "./record-seed-grants";
import { hashPassword } from "better-auth/crypto";
import { account, card, genre, user, userCard } from "../schema";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
const fixture = "seed-asset-ranking";
try {
  await db
    .insert(genre)
    .values({ id: fixture, slug: fixture, name: "資産ランキング確認", colorHex: "#0369a1" })
    .onConflictDoNothing();
  await db
    .insert(card)
    .values({
      id: fixture,
      genreId: fixture,
      title: "資産ランキング確認用カード",
      summary: "1枚337点の確認用",
      wikiLang: "ja",
      wikiPageId: -110800,
      rarity: "common",
      monthlyPageviews: 160,
      articleLength: 2679,
      pageviewsMeasuredAt: new Date(),
      isActive: false,
    })
    .onConflictDoNothing();
  const password = await hashPassword("password1234");
  for (const copies of [1, 2]) {
    const id = `${fixture}-${copies}`;
    const email = `asset-ranking${copies}@example.com`;
    await db
      .insert(user)
      .values({ id, name: `資産確認${copies}`, email, emailVerified: true })
      .onConflictDoNothing();
    await db
      .insert(account)
      .values({
        id,
        userId: id,
        accountId: id,
        providerId: "credential",
        password,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    for (let i = 0; i < copies; i++) {
      await db
        .insert(userCard)
        .values({ id: `${id}-${i}`, ownerId: id, cardId: fixture })
        .onConflictDoNothing();
    }
    console.log(`${email} / password1234（初期資産 ${copies * 337}点）`);
  }
  await recordSeedGrants(db);
} finally {
  await dispose();
}
