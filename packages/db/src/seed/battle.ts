import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "better-auth/crypto";
import { elementOf } from "../battle";
import { asc, eq, isNotNull } from "drizzle-orm";
import type { Database } from "../index";
import { account, battleTeam, card, cardDiscovery, genre, user, userCard } from "../schema";

// 既存の利用者・カードを消さず、専用の利用者を追加する。再実行しても所持品を増やさない。
export async function seedBattle(
  db: Database,
  emailPrefix = "battle",
  options: { fusionMaterials?: boolean } = {},
) {
  const candidates = await db
    .select({ card, slug: genre.slug })
    .from(card)
    .innerJoin(genre, eq(genre.id, card.genreId))
    .where(isNotNull(card.articleLength))
    .orderBy(asc(card.wikiPageId));
  const representatives = new Map<string, (typeof candidates)[number]>();
  for (const row of candidates)
    if (!representatives.has(elementOf(row.slug))) representatives.set(elementOf(row.slug), row);
  const cards = [
    ...new Map(
      [...representatives.values(), ...candidates].map((row) => [row.card.id, row.card]),
    ).values(),
  ].slice(0, 9);
  if (cards.length < 3)
    throw new Error(
      "能力値のあるカードが3種必要です。db:seed または wiki:load を先に実行してください。",
    );
  for (const [index, name] of ["アオイ", "アカネ"].entries()) {
    const email = `${emailPrefix}${index + 1}@example.com`;
    const [existing] = await db.select().from(user).where(eq(user.email, email));
    if (existing) continue;
    const id = createId();
    await db.insert(user).values({ id, name, email, emailVerified: true });
    await db.insert(account).values({
      id: createId(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: await hashPassword("password1234"),
      updatedAt: new Date(),
    });
    const owned: string[] = [];
    for (let i = 0; i < 12; i++) {
      const c = cards[(i + index) % cards.length]!;
      const [copy] = await db.insert(userCard).values({ userId: id, cardId: c.id }).returning();
      owned.push(copy!.id);
      await db
        .insert(cardDiscovery)
        .values({ userId: id, cardId: c.id, firstAcquiredAt: new Date() })
        .onConflictDoNothing();
    }
    if (options.fusionMaterials) {
      // 先頭2種類は既に各2枚あるため、各3枚を追加して未強化5枚にする。
      for (const c of [cards[index % cards.length]!, cards[(index + 1) % cards.length]!]) {
        for (let i = 0; i < 3; i++) await db.insert(userCard).values({ userId: id, cardId: c.id });
      }
      await db
        .insert(userCard)
        .values({
          userId: id,
          cardId: cards[index % cards.length]!.id,
          attackBonus: 123,
          defenseBonus: 45,
        });
    }
    await db.insert(battleTeam).values({
      userId: id,
      slot: 1,
      name: `${name}のチーム`,
      member1: owned[0]!,
      member2: owned[1]!,
      member3: owned[2]!,
    });
  }
}
