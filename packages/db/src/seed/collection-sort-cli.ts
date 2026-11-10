import { hashPassword } from "better-auth/crypto";
import { account, card, cardDiscovery, genre, user, userCard } from "../schema";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
const userId = "seed-collection-sort";
try {
  await db
    .insert(user)
    .values({
      id: userId,
      name: "並び替え確認",
      email: "collection-sort@example.com",
      emailVerified: true,
    })
    .onConflictDoNothing();
  await db
    .insert(account)
    .values({
      id: userId,
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword("password1234"),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
  await db
    .insert(genre)
    .values({ id: userId, slug: userId, name: "並び替え確認", colorHex: "#6366f1" })
    .onConflictDoNothing();
  const specs = [
    { title: "閲覧数トップ", monthlyPageviews: 900, articleLength: 100, rarity: "rare" as const },
    {
      title: "記事サイズトップ",
      monthlyPageviews: 500,
      articleLength: 900,
      rarity: "rare" as const,
    },
    { title: "新しいカード", monthlyPageviews: 300, articleLength: 500, rarity: "common" as const },
    {
      title: "記事サイズ未計測",
      monthlyPageviews: 100,
      articleLength: null,
      rarity: "common" as const,
    },
  ];
  for (const [i, spec] of specs.entries()) {
    const id = `${userId}-${i}`;
    const createdAt = new Date(Date.UTC(2026, 0, i + 1));
    await db
      .insert(card)
      .values({
        id,
        wikiLang: "ja",
        wikiPageId: -9100 - i,
        title: spec.title,
        summary: "並び替え動作確認用のサンプルカード",
        genreId: userId,
        rarity: spec.rarity,
        monthlyPageviews: spec.monthlyPageviews,
        articleLength: spec.articleLength,
        pageviewsMeasuredAt: createdAt,
        isActive: false,
      })
      .onConflictDoUpdate({ target: card.id, set: { title: spec.title } });
    await db.insert(userCard).values({ id, userId, cardId: id, createdAt }).onConflictDoNothing();
    await db
      .insert(cardDiscovery)
      .values({ userId, cardId: id, firstAcquiredAt: createdAt })
      .onConflictDoNothing();
  }
  console.log(
    "並び替え確認: collection-sort@example.com / password1234（既存データは削除しません）",
  );
} finally {
  await dispose();
}
