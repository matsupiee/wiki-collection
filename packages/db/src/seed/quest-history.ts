import { and, eq } from "drizzle-orm";
import type { Database } from "../index";
import { card, genre, pack, packOpening, packOpeningCard, userCard } from "../schema";
import { recordSeedGrants } from "./record-seed-grants";

// ローカル/APIテスト用。独立した排出停止パックに履歴を追加し、既存データは消さない。
export async function seedQuestHistory(
  db: Database,
  userId: string,
  options = { openings: 9, cards: 24, genres: 4 },
) {
  const slug = `quest-seed-${userId}`;
  let [p] = await db.select().from(pack).where(eq(pack.slug, slug));
  if (!p)
    [p] = await db
      .insert(pack)
      .values({
        slug,
        name: "クエスト確認",
        description: "確認専用",
        type: "free_basic",
        colorHex: "#0284c7",
        isActive: false,
      })
      .returning();
  const genres: (typeof genre.$inferSelect)[] = [];
  for (let i = 0; i < options.genres; i++) {
    const genreSlug = `${slug}-${i}`;
    let [g] = await db.select().from(genre).where(eq(genre.slug, genreSlug));
    if (!g)
      [g] = await db
        .insert(genre)
        .values({ slug: genreSlug, name: `クエスト確認 ${i + 1}`, colorHex: "#0284c7" })
        .returning();
    genres.push(g!);
  }
  const cards: (typeof card.$inferSelect)[] = [];
  for (let i = 0; i < options.cards; i++) {
    const title = `${slug} カード${i + 1}`;
    let [c] = await db.select().from(card).where(eq(card.title, title));
    if (!c)
      [c] = await db
        .insert(card)
        .values({
          wikiLang: "ja",
          wikiPageId: -Math.floor(Math.random() * 2_000_000_000) - 1,
          title,
          summary: "クエスト確認用カード",
          genreId: genres[i % genres.length]!.id,
          rarity: "common",
          monthlyPageviews: 1,
          articleLength: 100,
          pageviewsMeasuredAt: new Date(),
          isActive: false,
        })
        .returning();
    cards.push(c!);
  }
  const existing = await db
    .select()
    .from(packOpening)
    .where(and(eq(packOpening.userId, userId), eq(packOpening.packId, p!.id)));
  for (let i = existing.length; i < options.openings; i++) {
    const [opening] = await db
      .insert(packOpening)
      .values({ userId, packId: p!.id, payment: "free_daily" })
      .returning();
    const copies = await db
      .insert(userCard)
      .values(
        [0, 1, 2, 3, 4].map((slot) => ({
          ownerId: userId,
          cardId: cards[(i * 5 + slot) % cards.length]!.id,
        })),
      )
      .returning();
    await db
      .insert(packOpeningCard)
      .values(
        copies.map((c, slot) => ({
          packOpeningId: opening!.id,
          userCardId: c.id,
          cardId: c.cardId,
          slot: slot + 1,
        })),
      );
  }
  await recordSeedGrants(db);
}
