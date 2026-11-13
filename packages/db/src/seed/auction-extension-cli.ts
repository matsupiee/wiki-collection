// ローカルの専用出品で、締切直前の入札を繰り返し確認する。
import { and, eq } from "drizzle-orm";
import { card, marketListing, user, userCard } from "../schema";
import { openLocalDb } from "./local-db";

const sellerId = "seed-auction-extension";
const { db, dispose } = await openLocalDb();
try {
  const listingId = process.argv[2];
  if (listingId) {
    const armed = await db
      .update(marketListing)
      .set({ endsAt: new Date(Date.now() + 10_000) })
      .where(
        and(
          eq(marketListing.id, listingId),
          eq(marketListing.sellerId, sellerId),
          eq(marketListing.status, "active"),
        ),
      )
      .returning({ id: marketListing.id });
    if (!armed.length) throw new Error("このコマンドで用意した開催中の出品IDを指定してください。");
    console.log("残り10秒に設定しました。");
  } else {
    const item = await db.select({ id: card.id }).from(card).orderBy(card.wikiPageId).get();
    if (!item) throw new Error("先にカードマスターを取り込んでください。");
    await db
      .insert(user)
      .values({ id: sellerId, name: "延長確認", email: "auction-extension@example.com" })
      .onConflictDoNothing();
    const copyId = crypto.randomUUID();
    const id = crypto.randomUUID();
    await db.batch([
      db
        .insert(userCard)
        .values({ id: copyId, userId: sellerId, cardId: item.id, status: "listed" }),
      db
        .insert(marketListing)
        .values({
          id,
          sellerId,
          userCardId: copyId,
          cardId: item.id,
          format: "auction",
          startPrice: 10,
          endsAt: new Date(Date.now() + 3_600_000),
        }),
    ]);
    console.log(id);
  }
} finally {
  await dispose();
}
