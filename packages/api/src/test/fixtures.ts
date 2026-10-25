import type { Database } from "@wiki-collection/db";
import type { PackType, Rarity } from "@wiki-collection/db/enums";
import {
  card,
  coinDeposit,
  coinProduct,
  genre,
  pack,
  packFeaturedCard,
  packSlotRate,
  user,
  userCard,
} from "@wiki-collection/db/schema/index";

import type { ProtectedContext } from "../context";

let counter = 0;
const nextId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

// テスト用のユーザーを作り、そのユーザーでログインしている Context を返す
export async function createUserContext(
  db: Database,
  name = "テストユーザー",
  paymentMode: ProtectedContext["paymentMode"] = "mock",
): Promise<ProtectedContext> {
  const id = `user_${nextId()}`;
  const now = new Date();
  const [created] = await db
    .insert(user)
    .values({ id, name, email: `${id}@example.com`, emailVerified: true })
    .returning();
  return {
    db,
    paymentMode,
    session: {
      user: created!,
      session: {
        id: `session_${id}`,
        token: `token_${id}`,
        userId: id,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
        ipAddress: null,
        userAgent: null,
      },
    } as ProtectedContext["session"],
  };
}

export async function createGenre(db: Database, name = "テストジャンル") {
  const [created] = await db
    .insert(genre)
    .values({ slug: `genre-${nextId()}`, name, sourceCategory: name, colorHex: "#6366f1" })
    .returning();
  return created!;
}

export async function createCard(
  db: Database,
  input: { genreId: string; rarity: Rarity; title?: string; isActive?: boolean },
) {
  const [created] = await db
    .insert(card)
    .values({
      wikiLang: "ja",
      wikiPageId: Math.floor(Math.random() * 1_000_000_000),
      title: input.title ?? `カード ${nextId()}`,
      summary: "テスト用のカード",
      genreId: input.genreId,
      rarity: input.rarity,
      monthlyPageviews: 1000,
      pageviewsMeasuredAt: new Date(),
      isActive: input.isActive ?? true,
    })
    .returning();
  return created!;
}

// 5枚入りのパックを作る。rates を省略すると全枠コモンだけが出る
export async function createPack(
  db: Database,
  input: {
    type?: PackType;
    genreId?: string | null;
    priceCoins?: number | null;
    rates?: { slot: number; rarity: Rarity; weight: number }[];
    featured?: { cardId: string; weight: number }[];
  } = {},
) {
  const type = input.type ?? "free_basic";
  const [created] = await db
    .insert(pack)
    .values({
      slug: `pack-${nextId()}`,
      name: "テストパック",
      description: "テスト用のパック",
      type,
      genreId: input.genreId ?? null,
      priceCoins: input.priceCoins ?? (type === "premium" ? 100 : null),
      colorHex: "#8b5cf6",
    })
    .returning();
  const rates =
    input.rates ?? [1, 2, 3, 4, 5].map((slot) => ({ slot, rarity: "common" as const, weight: 1 }));
  await db.insert(packSlotRate).values(rates.map((r) => ({ ...r, packId: created!.id })));
  if (input.featured?.length) {
    await db
      .insert(packFeaturedCard)
      .values(input.featured.map((f) => ({ ...f, packId: created!.id })));
  }
  return created!;
}

export async function grantCoins(db: Database, userId: string, amount: number, isPaid = false) {
  await db.insert(coinDeposit).values({
    userId,
    source: isPaid ? "purchase" : "admin_grant",
    isPaid,
    amount,
  });
}

export async function giveCard(db: Database, userId: string, cardId: string) {
  const [created] = await db.insert(userCard).values({ userId, cardId }).returning();
  return created!;
}

export async function createCoinProduct(db: Database, coins = 1000) {
  const [created] = await db
    .insert(coinProduct)
    .values({
      sku: `sku-${nextId()}`,
      name: `${coins}pt`,
      priceAmount: 1000,
      currency: "USD",
      coins,
    })
    .returning();
  return created!;
}
