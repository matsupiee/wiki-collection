import { recordSeedGrants } from "./record-seed-grants";
// Local-only fixture: append deterministic openings without rewriting existing draws.
import { eq } from "drizzle-orm";
import { card, pack, packOpening, packOpeningCard, user, userCard } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  const guestName = process.argv[2];
  const owners = await db
    .select()
    .from(user)
    .where(guestName ? eq(user.name, guestName) : eq(user.email, "opening-juice1@example.com"))
    .limit(2);
  if (guestName && (owners.length !== 1 || !owners[0]!.email.endsWith("@guest.invalid")))
    throw new Error("iOSのマイページに表示される一意のゲスト名を指定してください。");
  const userId = owners[0]?.id ?? (await createUser(db, "開封確認", "opening-juice1@example.com"));
  const prefix = guestName ? `opening-juice-${userId}` : "opening-juice";
  console.log(
    `対象: ローカルD1 / ${guestName ?? "opening-juice1@example.com"} / 最大8開封・40枚を追加（既存結果は変更しません）`,
  );
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
    const id = `${prefix}-${variant}`;
    const savedOpening = await db.select().from(packOpening).where(eq(packOpening.id, id)).get();
    if (savedOpening && savedOpening.userId !== userId)
      throw new Error(`確認データの利用者が一致しません: ${id}`);
    await db
      .insert(packOpening)
      .values({ id, userId, packId: source.id, payment: "free_daily" })
      .onConflictDoNothing();
    for (const [slot, c] of order.entries()) {
      const existing = await db
        .select()
        .from(packOpeningCard)
        .where(eq(packOpeningCard.userCardId, `${id}-${slot}`))
        .get();
      if (existing) {
        if (existing.packOpeningId !== id || existing.slot !== slot + 1)
          throw new Error(`確認データの関連が一致しません: ${id}-${slot}`);
        continue;
      }
      const savedCard = await db
        .select()
        .from(userCard)
        .where(eq(userCard.id, `${id}-${slot}`))
        .get();
      if (savedCard && savedCard.ownerId !== userId)
        throw new Error(`未完了の確認データの所有者が一致しません: ${id}-${slot}`);
      const cardId = savedCard?.cardId ?? c.id;
      await db
        .insert(userCard)
        .values({
          id: `${id}-${slot}`,
          ownerId: userId,
          cardId,
        })
        .onConflictDoNothing();
      await db
        .insert(packOpeningCard)
        .values({
          id: `${id}-${slot}`,
          packOpeningId: id,
          userCardId: `${id}-${slot}`,
          cardId,
          slot: slot + 1,
        })
        .onConflictDoNothing();
    }
    console.log(`wiki-collection://openings/${id}`);
  }
  console.log(`Maestro: -e OPENING_PREFIX=${prefix}`);
  if (!guestName)
    console.log("opening-juice1@example.com / password1234（旧メール認証の確認専用）");
  await recordSeedGrants(db);
} finally {
  await dispose();
}
