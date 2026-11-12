// Local-only fixture: preserve real draws and existing users; create a dedicated account.
import { eq } from "drizzle-orm";
import { card, cardDiscovery, pack, packOpening, user, userCard } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  const [owner] = await db.select().from(user).where(eq(user.email, "opening-juice1@example.com"));
  const userId = owner?.id ?? (await createUser(db, "開封確認", "opening-juice1@example.com"));
  const [source] = await db.select().from(pack).where(eq(pack.type, "free_basic"));
  if (!source) throw new Error("既存マスターと無料パックが必要です。");
  const candidates = await db.select().from(card);
  function cardOfRarity(rarity: (typeof card.$inferSelect)["rarity"]) {
    const found = candidates.find((c) => c.rarity === rarity);
    if (!found) throw new Error(`${rarity} のカードが必要です。`);
    return found;
  }
  const common = cardOfRarity("common");
  const rare = cardOfRarity("rare");
  const sr = cardOfRarity("super_rare");
  const legendary = cardOfRarity("legendary");
  const selected = [common, rare, rare, sr, legendary];
  const openings = {
    "all-rarities": selected,
    // Use an illustrated first card when available to check emergence from the wrapper.
    trace: [
      candidates.find((c) => c.isActive && c.imageUrl && c.imageWidth && c.imageHeight) ?? common,
      rare,
      rare,
      sr,
      legendary,
    ],
    skip: selected,
    reduced: selected,
    reference: [common, legendary, rare, rare, sr],
    common: [common, common, common, common, common],
    rare: [rare, common, common, common, common],
    sr: [common, sr, rare, rare, rare],
  };
  for (const [variant, order] of Object.entries(openings)) {
    const id = `opening-juice-${variant}`;
    await db
      .insert(packOpening)
      .values({ id, userId, packId: source.id, payment: "free_daily" })
      .onConflictDoUpdate({ target: packOpening.id, set: { payment: "free_daily" } });
    for (const [slot, c] of order.entries()) {
      await db
        .insert(cardDiscovery)
        .values({ userId, cardId: c.id, firstAcquiredAt: new Date() })
        .onConflictDoNothing();
      await db
        .insert(userCard)
        .values({
          id: `${id}-${slot}`,
          userId,
          cardId: c.id,
          packOpeningId: id,
          slot,
          isNewOnAcquire: slot % 2 === 0,
        })
        .onConflictDoUpdate({ target: userCard.id, set: { cardId: c.id } });
    }
    console.log(`wiki-collection://openings/${id}`);
  }
  console.log("opening-juice1@example.com / password1234（確認専用、抽選・残数は変更しません）");
} finally {
  await dispose();
}
