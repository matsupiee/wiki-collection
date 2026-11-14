// ローカル専用。5枚の開封結果のうち1枚を確認用ユーザーへ移した状態を作る。
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import {
  card,
  coinDeposit,
  genre,
  marketListing,
  pack,
  packOpening,
  packOpeningCard,
  user,
  userCard,
  userCardOwnershipTransfers,
} from "../schema";
import { openLocalDb } from "./local-db";
const { values } = parseArgs({ options: { "user-name": { type: "string" } } });
if (!values["user-name"])
  throw new Error("--user-name にローカルアプリのゲスト名を指定してください。");
const { db, dispose } = await openLocalDb();
try {
  const owners = await db.select().from(user).where(eq(user.name, values["user-name"])).limit(2);
  if (owners.length !== 1) throw new Error("一意のユーザー名が必要です。");
  const ownerId = owners[0]!.id;
  const prefix = `ownership-history-${ownerId}`;
  const receiverId = `${prefix}-receiver`;
  const [p] = await db.select().from(pack).where(eq(pack.type, "free_basic"));
  if (!p) throw new Error("先に無料パックのマスターを作成してください。");
  const [existing] = await db.select().from(packOpening).where(eq(packOpening.id, prefix));
  if (!existing) {
    const now = new Date();
    await db.batch([
      db
        .insert(user)
        .values({
          id: receiverId,
          name: "所有権履歴の確認相手",
          email: `${receiverId}@example.com`,
          emailVerified: true,
        }),
      db
        .insert(genre)
        .values({ id: prefix, slug: prefix, name: "所有権履歴の確認", colorHex: "#0369a1" }),
      db
        .insert(card)
        .values({
          id: prefix,
          genreId: prefix,
          wikiLang: "ja",
          wikiPageId: -Math.floor(Date.now() / 1000),
          title: "所有権履歴の確認カード",
          summary: "開封結果には5枚、現在のコレクションには4枚が表示されます。",
          rarity: "common",
          monthlyPageviews: 1,
          articleLength: 100,
          pageviewsMeasuredAt: now,
          isActive: false,
        }),
      db
        .insert(packOpening)
        .values({
          id: prefix,
          userId: ownerId,
          packId: p.id,
          payment: "free_daily",
          revealedAt: now,
        }),
      db
        .insert(userCard)
        .values(
          [1, 2, 3, 4, 5].map((slot) => ({
            id: `${prefix}-${slot}`,
            ownerId: slot === 1 ? receiverId : ownerId,
            cardId: prefix,
          })),
        ),
      db
        .insert(packOpeningCard)
        .values(
          [1, 2, 3, 4, 5].map((slot) => ({
            packOpeningId: prefix,
            userCardId: `${prefix}-${slot}`,
            cardId: prefix,
            slot,
          })),
        ),
      db
        .insert(userCardOwnershipTransfers)
        .values(
          [1, 2, 3, 4, 5].map((slot) => ({
            userCardId: `${prefix}-${slot}`,
            cardId: prefix,
            toUserId: ownerId,
            reason: "pack_open" as const,
            createdAt: now,
          })),
        ),
      db
        .insert(marketListing)
        .values({
          id: prefix,
          userCardId: `${prefix}-1`,
          cardId: prefix,
          sellerId: ownerId,
          buyerId: receiverId,
          format: "auction",
          status: "sold",
          startPrice: 10,
          soldPrice: 10,
          soldAt: now,
        }),
      db
        .insert(userCardOwnershipTransfers)
        .values({
          userCardId: `${prefix}-1`,
          cardId: prefix,
          fromUserId: ownerId,
          toUserId: receiverId,
          reason: "market_sale",
          marketListingId: prefix,
          createdAt: now,
        }),
      db
        .insert(coinDeposit)
        .values({
          userId: ownerId,
          source: "market_sale",
          marketListingId: prefix,
          amount: 10,
          isPaid: false,
        }),
    ]);
  }
  console.log(
    `開封履歴の「所有権履歴の確認カード」を確認してください。5枚の結果と4枚の所持を確認できます。再実行で増えません。`,
  );
} finally {
  await dispose();
}
