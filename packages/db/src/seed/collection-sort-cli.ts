import { recordSeedGrants } from "./record-seed-grants";
import { parseArgs } from "node:util";
import { rarityFromPageviews } from "../rarity";
import { hashPassword } from "better-auth/crypto";
import { account, card, genre, user, userCard } from "../schema";
import { openLocalDb } from "./local-db";

const { values } = parseArgs({ options: { "user-id": { type: "string" } } });
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
    { title: "閲覧数トップ", monthlyPageviews: 100000, articleLength: 100 },
    {
      title: "記事サイズトップ",
      monthlyPageviews: 10000,
      articleLength: 900,
    },
    { title: "新しいカード", monthlyPageviews: 1000, articleLength: 500 },
    {
      title: "記事サイズ未計測",
      monthlyPageviews: 99,
      articleLength: null,
    },
    { title: "アンコモンのカード", monthlyPageviews: 100, articleLength: 200 },
  ];
  for (const [i, spec] of specs.entries()) {
    const id = `${userId}-${i}`;
    const rarity = rarityFromPageviews(spec.monthlyPageviews);
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
        rarity,
        monthlyPageviews: spec.monthlyPageviews,
        articleLength: spec.articleLength,
        pageviewsMeasuredAt: createdAt,
        isActive: false,
      })
      .onConflictDoUpdate({
        target: card.id,
        set: { title: spec.title, monthlyPageviews: spec.monthlyPageviews, rarity },
      });
    await db
      .insert(userCard)
      .values({
        id: values["user-id"] ? `${id}-${values["user-id"]}` : id,
        ownerId: values["user-id"] ?? userId,
        cardId: id,
        createdAt,
      })
      .onConflictDoNothing();
  }
  console.log(
    "並び替え確認: collection-sort@example.com / password1234（既存データは削除しません）",
  );
  await recordSeedGrants(db);
} finally {
  await dispose();
}
