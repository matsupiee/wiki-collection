// Local-only fixture: preserve real draws and existing users; create a dedicated account.
import { eq } from "drizzle-orm";
import { card, pack, packOpening, user, userCard } from "../schema";
import { seedBattle } from "./battle";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  await seedBattle(db, "opening-juice");
  const [owner] = await db.select().from(user).where(eq(user.email, "opening-juice1@example.com"));
  const [source] = await db.select().from(pack).where(eq(pack.type, "free_basic"));
  if (!owner || !source) throw new Error("既存マスターと無料パックが必要です。");
  const rarities = ["common", "uncommon", "rare", "double_rare", "legendary"] as const;
  const candidates = await db.select().from(card);
  const selected = rarities.map((rarity) => {
    const found = candidates.find((c) => c.rarity === rarity);
    if (!found) throw new Error(`${rarity} のカードが必要です。`);
    return found;
  });
  for (const variant of ["all-rarities", "skip", "reduced", "reference"]) {
    const id = `opening-juice-${variant}`;
    await db
      .insert(packOpening)
      .values({ id, userId: owner.id, packId: source.id, payment: "free_daily" })
      .onConflictDoUpdate({ target: packOpening.id, set: { payment: "free_daily" } });
    const order =
      variant === "reference" ? [selected[0]!, selected[4]!, ...selected.slice(1, 4)] : selected;
    for (const [slot, c] of order.entries()) {
      await db
        .insert(userCard)
        .values({
          id: `${id}-${slot}`,
          userId: owner.id,
          cardId: c.id,
          packOpeningId: id,
          slot,
          isNewOnAcquire: slot % 2 === 0,
        })
        .onConflictDoNothing();
    }
    console.log(`wiki-collection://openings/${id}`);
  }
  console.log("opening-juice1@example.com / password1234（確認専用、抽選・残数は変更しません）");
} finally {
  await dispose();
}
