import { recordSeedGrants } from "./record-seed-grants";
// ローカル D1 を作り直し、ユーザーストーリー確認用のデータを入れる。
// 使い方: bun run db:seed（ルート） または packages/db で bun run seed
// 作るユーザー（パスワードはすべて password1234）
// - taro@example.com: 登録したばかり。無料パックが 10 開けられる
// - hanako@example.com: カードを集めている。出品中のカード、未確認の開封、pt がある
// - jiro@example.com: hanako のオークションに入札している
// - shiro@example.com: 無料枠を使い切った
import { createUser } from "./create-user";
import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "../index";
import {
  auctionBid,
  card,
  packOpeningCard,
  coinDeposit,
  coinDepositWithdraw,
  coinProduct,
  coinPurchase,
  coinWithdraw,
  freePackAllowance,
  genre,
  marketListing,
  packOpening,
  rarityThreshold,
  userCard,
} from "../schema";
import { seedPacks } from "./packs";
import { reset } from "./reset";
import { openLocalDb } from "./local-db";
import { rarityFromPageviews, rarityThresholds } from "../rarity";
import { cards, coinProducts, genres } from "./master-data";

const HOUR = 60 * 60 * 1000;

async function seedMaster(db: Database) {
  // D1 は1文あたりのバインド変数が 100 個までなので分けて入れる
  // wiki:load と同じく、カードの多いジャンルから並べる
  const countBySlug = (slug: string) => cards.filter((c) => c[0] === slug).length;
  const genreValues = [...genres]
    .sort((a, b) => countBySlug(b.slug) - countBySlug(a.slug))
    .map((g, i) => ({ ...g, sortOrder: i }));
  const genreRows = [];
  for (let i = 0; i < genreValues.length; i += 10) {
    genreRows.push(
      ...(await db
        .insert(genre)
        .values(genreValues.slice(i, i + 10))
        .returning()),
    );
  }
  const genreIdBySlug = new Map(genreRows.map((g) => [g.slug, g.id]));

  const ranked = [...cards].sort((a, b) => b[2] - a[2]);
  const cardValues = ranked.map(([genreSlug, title, monthlyPageviews, summary], rank) => ({
    wikiLang: "ja",
    // サンプルデータなので実在の page_id ではない
    wikiPageId: 900000 + rank,
    title,
    summary,
    genreId: genreIdBySlug.get(genreSlug)!,
    rarity: rarityFromPageviews(monthlyPageviews),
    articleLength: 10000 + rank * 500,
    monthlyPageviews,
    pageviewsMeasuredAt: new Date(),
    wikiFetchedAt: new Date(),
  }));
  // Wikipedia から取り込むときは、ここで入れた下限でレアリティを決める
  const thresholds = rarityThresholds;
  await db.insert(rarityThreshold).values(
    Object.entries(thresholds).map(([rarity, minMonthlyPageviews]) => ({
      wikiLang: "ja",
      rarity: rarity as keyof typeof thresholds,
      minMonthlyPageviews,
    })),
  );
  // D1 は1文あたりのバインド変数が 100 個までなので分けて入れる
  const cardRows = [];
  for (let i = 0; i < cardValues.length; i += 5) {
    cardRows.push(
      ...(await db
        .insert(card)
        .values(cardValues.slice(i, i + 5))
        .returning()),
    );
  }
  const cardByTitle = new Map(cardRows.map((c) => [c.title, c]));

  const packRows = await seedPacks(db);
  const productRows = await db.insert(coinProduct).values(coinProducts).returning();
  return { cardByTitle, packBySlug: new Map(packRows.map((p) => [p.slug, p])), productRows };
}

async function deposit(db: Database, values: typeof coinDeposit.$inferInsert) {
  await db.insert(coinDeposit).values(values);
}

// API と同じく、無償 pt の古い獲得分から順に割り当てて消費する
async function withdraw(
  db: Database,
  values: Omit<typeof coinWithdraw.$inferInsert, "userSequence">,
) {
  const remaining = sql<number>`${coinDeposit.amount} - coalesce(sum(${coinDepositWithdraw.amount}), 0)`;
  const deposits = await db
    .select({ id: coinDeposit.id, remaining })
    .from(coinDeposit)
    .leftJoin(coinDepositWithdraw, eq(coinDepositWithdraw.depositId, coinDeposit.id))
    .where(eq(coinDeposit.userId, values.userId))
    .groupBy(coinDeposit.id)
    .having(sql`${remaining} > 0`)
    .orderBy(asc(coinDeposit.isPaid), asc(coinDeposit.createdAt));
  const [last] = await db
    .select({ sequence: sql<number | null>`max(${coinWithdraw.userSequence})` })
    .from(coinWithdraw)
    .where(eq(coinWithdraw.userId, values.userId));
  const [created] = await db
    .insert(coinWithdraw)
    .values({ ...values, userSequence: Number(last?.sequence ?? 0) + 1 })
    .returning();
  let rest = values.amount;
  for (const d of deposits) {
    if (rest <= 0) break;
    const amount = Math.min(Number(d.remaining), rest);
    await db
      .insert(coinDepositWithdraw)
      .values({ depositId: d.id, withdrawId: created!.id, amount });
    rest -= amount;
  }
  if (rest > 0) throw new Error(`seed: ${values.userId} の pt が足りません`);
  return created!;
}

async function purchase(db: Database, userId: string, product: typeof coinProduct.$inferSelect) {
  const [created] = await db
    .insert(coinPurchase)
    .values({
      userId,
      coinProductId: product.id,
      provider: "mock",
      providerPaymentId: `seed_${crypto.randomUUID()}`,
      coins: product.coins,
      status: "completed",
      completedAt: new Date(),
    })
    .returning();
  await deposit(db, {
    userId,
    source: "purchase",
    isPaid: true,
    amount: product.coins,
    coinPurchaseId: created!.id,
  });
}

async function openPack(
  db: Database,
  userId: string,
  packId: string,
  titles: string[],
  cardByTitle: Map<string, typeof card.$inferSelect>,
  options: {
    revealed: boolean;
    payment: "free_daily" | "coin";
    coinsSpent?: number;
  },
) {
  const [opening] = await db
    .insert(packOpening)
    .values({
      userId,
      packId,
      payment: options.payment,
      coinsSpent: options.coinsSpent ?? 0,
      revealedAt: options.revealed ? new Date() : null,
    })
    .returning();
  const rarityOrder = ["common", "uncommon", "rare", "super_rare", "legendary"];
  const sorted = titles
    .map((t) => cardByTitle.get(t)!)
    .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  const rows = [];
  for (const c of sorted) {
    const [row] = await db
      .insert(userCard)
      .values({
        ownerId: userId,
        cardId: c.id,
      })
      .returning();
    await db
      .insert(packOpeningCard)
      .values({
        packOpeningId: opening!.id,
        userCardId: row!.id,
        cardId: c.id,
        slot: rows.length + 1,
      });
    rows.push(row!);
  }
  return { opening: opening!, userCards: rows };
}

async function main() {
  const { db, dispose } = await openLocalDb();
  try {
    await reset(db);
    const { cardByTitle, packBySlug, productRows } = await seedMaster(db);
    const basic = packBySlug.get("basic")!;
    const superRare = packBySlug.get("double-rare-guaranteed")!;
    const now = Date.now();

    await createUser(db, "たろう", "taro@example.com");

    // hanako: 基本パックを3回、SR1枚確定ガチャを1回開けている。最後の基本パックは演出を見ていない
    const hanako = await createUser(db, "はなこ", "hanako@example.com");
    await purchase(db, hanako, productRows[1]!);
    await db.insert(freePackAllowance).values({
      userId: hanako,
      fullAt: now + 30 * 60_000,
    });
    const opened = [
      await openPack(
        db,
        hanako,
        basic.id,
        ["水", "折り紙", "信濃川", "将棋", "ブラックホール"],
        cardByTitle,
        {
          revealed: true,
          payment: "free_daily",
        },
      ),
      await openPack(
        db,
        hanako,
        basic.id,
        ["水", "茶道", "和食", "徳川家康", "富士山"],
        cardByTitle,
        {
          revealed: true,
          payment: "free_daily",
        },
      ),
      await openPack(
        db,
        hanako,
        superRare.id,
        ["瀬戸内海", "折り紙", "信濃川", "将棋", "太陽"],
        cardByTitle,
        {
          revealed: true,
          payment: "coin",
          coinsSpent: superRare.priceCoins!,
        },
      ),
      await openPack(
        db,
        hanako,
        basic.id,
        ["電気", "瀬戸内海", "屋久島", "相撲", "織田信長"],
        cardByTitle,
        {
          revealed: false,
          payment: "free_daily",
        },
      ),
    ];
    await withdraw(db, {
      userId: hanako,
      purpose: "pack_open",
      amount: superRare.priceCoins!,
      packOpeningId: opened[2]!.opening.id,
    });
    const pick = (index: number, title: string) =>
      opened[index]!.userCards.find((u) => u.cardId === cardByTitle.get(title)!.id)!;

    // オークション: 徳川家康を開始 50pt で出品し、jiro が 50pt で入札している（残り12時間）
    const jiro = await createUser(db, "じろう", "jiro@example.com");
    await purchase(db, jiro, productRows[1]!);
    const ieyasu = pick(1, "徳川家康");
    await db.update(userCard).set({ status: "listed" }).where(eq(userCard.id, ieyasu.id));
    const [auction] = await db
      .insert(marketListing)
      .values({
        sellerId: hanako,
        userCardId: ieyasu.id,
        cardId: ieyasu.cardId,
        format: "auction",
        startPrice: 50,
        currentPrice: 50,
        bidCount: 1,
        endsAt: new Date(now + 12 * HOUR),
      })
      .returning();
    const [bid] = await db
      .insert(auctionBid)
      .values({
        listingId: auction!.id,
        bidderId: jiro,
        sequence: 1,
        amount: 50,
        status: "leading",
      })
      .returning();
    await withdraw(db, {
      userId: jiro,
      purpose: "auction_bid",
      amount: 50,
      marketListingId: auction!.id,
      auctionBidId: bid!.id,
    });

    // 3列の一覧で2行目まで確認するため、追加の3枚を出品する。
    for (const [index, title] of ["折り紙", "信濃川", "将棋"].entries()) {
      const cardId = cardByTitle.get(title)!.id;
      const [copy] = await db
        .insert(userCard)
        .values({ ownerId: hanako, cardId, status: "listed" })
        .returning();
      const price = (index + 1) * 100;
      await db.insert(marketListing).values({
        sellerId: hanako,
        userCardId: copy!.id,
        cardId,
        format: "auction",
        startPrice: price,
        endsAt: new Date(now + (20 + index) * HOUR),
      });
    }

    // 終了済みのオークション: 富士山に jiro が 60pt で入札したまま1時間前に終わった。マーケットを開くと締められる
    const fuji = pick(1, "富士山");
    await db.update(userCard).set({ status: "listed" }).where(eq(userCard.id, fuji.id));
    const [ended] = await db
      .insert(marketListing)
      .values({
        sellerId: hanako,
        userCardId: fuji.id,
        cardId: fuji.cardId,
        format: "auction",
        startPrice: 60,
        currentPrice: 60,
        bidCount: 1,
        endsAt: new Date(now - HOUR),
      })
      .returning();
    const [endedBid] = await db
      .insert(auctionBid)
      .values({ listingId: ended!.id, bidderId: jiro, sequence: 1, amount: 60, status: "leading" })
      .returning();
    await withdraw(db, {
      userId: jiro,
      purpose: "auction_bid",
      amount: 60,
      marketListingId: ended!.id,
      auctionBidId: endedBid!.id,
    });

    // shiro: 10 パックを使い切った
    const shiro = await createUser(db, "しろう", "shiro@example.com");
    await db.insert(freePackAllowance).values({ userId: shiro, fullAt: Date.now() + 100 * 60_000 });

    console.log(
      `seed: カード ${cardByTitle.size} 枚、パック ${packBySlug.size} 種類、ユーザー 4 人を作りました`,
    );
    await recordSeedGrants(db);
  } finally {
    await dispose();
  }
}

await main();
