import { card, genre } from "../schema";
import { rarityFromPageviews } from "../rarity";
import { openLocalDb } from "./local-db";
import { syncGuaranteedPacks } from "./packs";

// 既存利用者や所持品を消さず、全レアリティの排出候補をローカルに用意する。
const { db, dispose } = await openLocalDb();
try {
  const [category] = await db
    .insert(genre)
    .values({
      slug: "pack-rates-check",
      name: "排出率確認",
      colorHex: "#6366f1",
    })
    .onConflictDoUpdate({ target: genre.slug, set: { name: "排出率確認" } })
    .returning();
  for (const [index, views] of [99, 100, 1000, 10000, 100000].entries()) {
    const rarity = rarityFromPageviews(views);
    const values = {
      wikiLang: "ja",
      wikiPageId: -9300 - index,
      title: `排出率確認 ${rarity}`,
      summary: "ローカル開封確認用カード",
      genreId: category!.id,
      rarity,
      monthlyPageviews: views,
      pageviewsMeasuredAt: new Date(),
      isActive: true,
    };
    await db
      .insert(card)
      .values(values)
      .onConflictDoUpdate({
        target: [card.wikiLang, card.wikiPageId],
        set: values,
      });
  }
  await syncGuaranteedPacks(db);
  console.log(
    "ローカルに5段階の排出候補を用意しました。無料枠1つ・600pt以上の利用者でpack-slot-rates.yamlを実行してください。",
  );
} finally {
  await dispose();
}
