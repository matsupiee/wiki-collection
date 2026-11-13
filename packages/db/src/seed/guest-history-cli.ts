// Add a recognizable history entry and a tradable card to an existing local guest.
import { eq } from "drizzle-orm";
import { card, cardDiscovery, coinDeposit, user, userCard } from "../schema";
import { openLocalDb } from "./local-db";

const player = process.argv[2];
if (!player) throw new Error("マイページに表示されるゲスト名を指定してください。");
const { db, dispose } = await openLocalDb();
try {
  const players = await db.select().from(user).where(eq(user.name, player)).limit(2);
  if (players.length !== 1) throw new Error("一意のゲスト名が必要です。");
  const userId = players[0]!.id;
  const item = await db.select({ id: card.id }).from(card).orderBy(card.wikiPageId).get();
  if (!item) throw new Error("先にカードマスターを取り込んでください。");
  await db.batch([
    db
      .insert(coinDeposit)
      .values({
        id: "guest-credit-" + userId,
        userId,
        source: "admin_grant",
        isPaid: false,
        amount: 2000,
      })
      .onConflictDoNothing(),
    db
      .insert(userCard)
      .values({ id: "guest-card-" + userId, userId, cardId: item.id })
      .onConflictDoNothing(),
    db
      .insert(cardDiscovery)
      .values({ userId, cardId: item.id, firstAcquiredAt: new Date() })
      .onConflictDoNothing(),
  ]);
} finally {
  await dispose();
}
