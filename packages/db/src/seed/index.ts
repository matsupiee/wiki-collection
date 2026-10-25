// ローカル D1 を作り直し、ユーザーストーリー確認用のデータを入れる。
// 使い方: bun run db:seed（ルート） または packages/db で bun run seed
// 作るユーザー（パスワードはすべて password1234）
// - taro@example.com: 登録したばかり。無料パックが 30 開けられる
// - hanako@example.com: カードを集めている。出品中のカード、未確認の開封、pt がある
// - jiro@example.com: hanako のオークションに入札している
// - shiro@example.com: 今日の無料パックを使い切った
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, sql } from "drizzle-orm";

import type { Database } from "../index";
import {
  account,
  auctionBid,
  card,
  cardDiscovery,
  coinDeposit,
  coinDepositWithdraw,
  coinProduct,
  coinPurchase,
  coinWithdraw,
  freePackAllowance,
  genre,
  marketListing,
  pack,
  packFeaturedCard,
  packOpening,
  packSlotRate,
  rarityThreshold,
  session,
  user,
  userCard,
  verification,
} from "../schema";
import { openLocalDb } from "./local-db";
import { rarityByRank, thresholdsFromPageviews } from "../rarity";
import { cards, coinProducts, genres, packs, slotRates } from "./master-data";

const PASSWORD = "password1234";
const HOUR = 60 * 60 * 1000;

async function reset(db: Database) {
  // 外部キーの参照先より先に参照元を消す
  for (const table of [
    coinDepositWithdraw,
    coinWithdraw,
    coinDeposit,
    auctionBid,
    marketListing,
    coinPurchase,
    cardDiscovery,
    userCard,
    packOpening,
    freePackAllowance,
    packFeaturedCard,
    packSlotRate,
    pack,
    card,
    rarityThreshold,
    genre,
    coinProduct,
    session,
    account,
    verification,
    user,
  ]) {
    await db.delete(table);
  }
}

async function seedMaster(db: Database) {
  const genreRows = await db
    .insert(genre)
    .values(genres.map((g, i) => ({ ...g, sortOrder: i })))
    .returning();
  const genreIdBySlug = new Map(genreRows.map((g) => [g.slug, g.id]));

  const ranked = [...cards].sort((a, b) => b[2] - a[2]);
  const cardValues = ranked.map(([genreSlug, title, monthlyPageviews, summary], rank) => ({
    wikiLang: "ja",
    // サンプルデータなので実在の page_id ではない
    wikiPageId: 900000 + rank,
    title,
    summary,
    genreId: genreIdBySlug.get(genreSlug)!,
    rarity: rarityByRank(rank, ranked.length),
    monthlyPageviews,
    pageviewsMeasuredAt: new Date(),
    wikiFetchedAt: new Date(),
  }));
  // Wikipedia から取り込むときは、ここで入れた下限でレアリティを決める
  const thresholds = thresholdsFromPageviews(ranked.map((c) => c[2]));
  await db.insert(rarityThreshold).values(
    Object.entries(thresholds).map(([rarity, minMonthlyPageviews]) => ({
      wikiLang: "ja",
      rarity: rarity as keyof typeof thresholds,
      minMonthlyPageviews,
    })),
  );
  // D1 は1文あたりのバインド変数が 100 個までなので分けて入れる
  const cardRows = [];
  for (let i = 0; i < cardValues.length; i += 8) {
    cardRows.push(
      ...(await db
        .insert(card)
        .values(cardValues.slice(i, i + 8))
        .returning()),
    );
  }
  const cardByTitle = new Map(cardRows.map((c) => [c.title, c]));

  const packRows = [];
  for (const [i, p] of packs.entries()) {
    const [created] = await db
      .insert(pack)
      .values({
        slug: p.slug,
        name: p.name,
        description: p.description,
        type: p.type,
        genreId: p.genreSlug ? genreIdBySlug.get(p.genreSlug)! : null,
        priceCoins: p.priceCoins,
        colorHex: p.colorHex,
        sortOrder: i,
      })
      .returning();
    await db.insert(packSlotRate).values(
      slotRates[p.rates].flatMap((weights, index) =>
        Object.entries(weights)
          .filter(([, weight]) => weight > 0)
          .map(([rarity, weight]) => ({
            packId: created!.id,
            slot: index + 1,
            rarity: rarity as keyof typeof weights,
            weight,
          })),
      ),
    );
    if (p.featured.length > 0) {
      await db.insert(packFeaturedCard).values(
        p.featured.map((title) => ({
          packId: created!.id,
          cardId: cardByTitle.get(title)!.id,
          weight: 5,
        })),
      );
    }
    packRows.push(created!);
  }

  const productRows = await db.insert(coinProduct).values(coinProducts).returning();
  return { cardByTitle, packBySlug: new Map(packRows.map((p) => [p.slug, p])), productRows };
}

async function createUser(db: Database, name: string, email: string) {
  const id = crypto.randomUUID().replaceAll("-", "");
  await db.insert(user).values({ id, name, email, emailVerified: true });
  await db.insert(account).values({
    id: crypto.randomUUID().replaceAll("-", ""),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(PASSWORD),
    updatedAt: new Date(),
  });
  return id;
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
      amount: product.priceAmount,
      currency: product.currency,
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
    payment: "free_initial" | "free_daily" | "coin";
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
  const rarityOrder = ["common", "uncommon", "rare", "double_rare", "legendary"];
  const sorted = titles
    .map((t) => cardByTitle.get(t)!)
    .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  const rows = [];
  for (const [i, c] of sorted.entries()) {
    const [existing] = await db
      .select()
      .from(cardDiscovery)
      .where(and(eq(cardDiscovery.userId, userId), eq(cardDiscovery.cardId, c.id)));
    if (!existing) {
      await db.insert(cardDiscovery).values({ userId, cardId: c.id, firstAcquiredAt: new Date() });
    }
    const [row] = await db
      .insert(userCard)
      .values({
        userId,
        cardId: c.id,
        packOpeningId: opening!.id,
        slot: i + 1,
        isNewOnAcquire: !existing,
      })
      .returning();
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
    const space = packBySlug.get("space")!;
    const now = Date.now();

    await createUser(db, "たろう", "taro@example.com");

    // hanako: 基本パックを3回、宇宙パックを1回開けている。最後の基本パックは演出を見ていない
    const hanako = await createUser(db, "はなこ", "hanako@example.com");
    await purchase(db, hanako, productRows[1]!);
    await db.insert(freePackAllowance).values({ userId: hanako, initialRemaining: 17 });
    const opened = [
      await openPack(
        db,
        hanako,
        basic.id,
        ["水", "折り紙", "信濃川", "将棋", "ブラックホール"],
        cardByTitle,
        {
          revealed: true,
          payment: "free_initial",
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
          payment: "free_initial",
        },
      ),
      await openPack(
        db,
        hanako,
        space.id,
        ["冥王星", "はやぶさ2", "土星", "月", "ブラックホール"],
        cardByTitle,
        {
          revealed: true,
          payment: "coin",
          coinsSpent: 150,
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
          payment: "free_initial",
        },
      ),
    ];
    await withdraw(db, {
      userId: hanako,
      purpose: "pack_open",
      amount: 150,
      packOpeningId: opened[2]!.opening.id,
    });
    const water = opened[0]!.userCards[0]!;
    await db
      .update(userCard)
      .set({ status: "redeemed", redeemedAt: new Date() })
      .where(eq(userCard.id, water.id));
    await deposit(db, {
      userId: hanako,
      source: "card_redeem",
      isPaid: false,
      amount: 1,
      userCardId: water.id,
    });

    const pick = (index: number, title: string) =>
      opened[index]!.userCards.find((u) => u.cardId === cardByTitle.get(title)!.id)!;

    // フリマ: ブラックホール 1枚を 90pt で出品中
    const blackHole = pick(0, "ブラックホール");
    await db.update(userCard).set({ status: "listed" }).where(eq(userCard.id, blackHole.id));
    await db.insert(marketListing).values({
      sellerId: hanako,
      userCardId: blackHole.id,
      cardId: blackHole.cardId,
      format: "fixed_price",
      price: 90,
    });

    // オークション: 徳川家康を開始 50pt で出品し、jiro が 50pt で入札している（残り2日）
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
        endsAt: new Date(now + 48 * HOUR),
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

    // shiro: 登録時の 20 パックも今日の 10 パックも使い切った
    const shiro = await createUser(db, "しろう", "shiro@example.com");
    const todayJst = new Date(now + 9 * HOUR).toISOString().slice(0, 10);
    await db
      .insert(freePackAllowance)
      .values({ userId: shiro, initialRemaining: 0, dailyUsedDate: todayJst, dailyUsedCount: 10 });

    console.log(
      `seed: カード ${cardByTitle.size} 枚、パック ${packBySlug.size} 種類、ユーザー 4 人を作りました`,
    );
  } finally {
    await dispose();
  }
}

await main();
