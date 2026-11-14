import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/d1/migrator";
import { sql } from "drizzle-orm";
import {
  packOpening,
  packOpeningCard,
  userCard,
  userCardOwnershipTransfers,
} from "@wiki-collection/db/schema/index";
import { createTestDb } from "./create-test-db";
import { createCard, createGenre, createPack, createUserContext } from "./fixtures";
import { handler as getCard } from "../routers/consumer/card/get/handler";
import { normalizeOwnershipReasons } from "@wiki-collection/db/seed/normalize-ownership-reasons";

const migrationFolder = path.resolve(import.meta.dirname, "../../../db/src/migrations");
const current = "20261114043302_card_ownership_history";
test("本番適用済みの所有権履歴マイグレーションを書き換えない", async () => {
  const sql = await Bun.file(path.join(migrationFolder, current, "migration.sql")).text();
  // 2026-11-14、本番 __alchemy_migrations から読み取った適用済みハッシュ。
  expect(createHash("sha256").update(sql).digest("hex")).toBe(
    "8a640601475ffdbe26b3f7af3eb8813472c9ba187e8d221534cee6d5a72eb4a4",
  );
});
test("旧DBの開封・売買・旧獲得記録を失わず移行し、再実行で増えない", async () => {
  const oldFolder = await mkdtemp(path.join(tmpdir(), "wiki-history-migration-"));
  let dispose: (() => Promise<void>) | undefined;
  try {
    for (const name of await readdir(migrationFolder)) {
      if (name < current)
        await cp(path.join(migrationFolder, name), path.join(oldFolder, name), { recursive: true });
    }
    const store = await createTestDb(oldFolder);
    dispose = store.dispose;
    const db = store.db;
    const seller = await createUserContext(db);
    const buyer = await createUserContext(db);
    const former = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db);
    const [opening] = await db
      .insert(packOpening)
      .values({ userId: seller.session.user.id, packId: p.id, payment: "free_daily" })
      .returning();
    await db.run(sql`INSERT INTO user_card (id, user_id, card_id, pack_opening_id)
      VALUES ('migration-copy', ${buyer.session.user.id}, ${c.id}, ${opening!.id})`);
    await db.run(sql`INSERT INTO market_listing (id, seller_id, buyer_id, user_card_id, card_id, format, status, sold_price, sold_at)
      VALUES ('migration-sale', ${seller.session.user.id}, ${buyer.session.user.id}, 'migration-copy', ${c.id}, 'auction', 'sold', 10, ${Date.now()})`);
    await db.run(sql`INSERT INTO card_discovery (id, user_id, card_id, first_acquired_at)
      VALUES ('migration-old-discovery', ${former.session.user.id}, ${c.id}, ${Date.now() - 10000})`);
    await migrate(db, { migrationsFolder: migrationFolder });
    expect(await db.all(sql`PRAGMA foreign_key_check`)).toEqual([]);
    const [copy] = await db.select().from(userCard);
    expect(copy).toMatchObject({ id: "migration-copy", ownerId: buyer.session.user.id });
    expect(await db.select().from(packOpeningCard)).toMatchObject([
      { packOpeningId: opening!.id, userCardId: "migration-copy", cardId: c.id, slot: 1 },
    ]);
    const transfers = await db.select().from(userCardOwnershipTransfers);
    expect(transfers).toHaveLength(3);
    expect(
      transfers.find((t) => t.userCardId === "migration-copy" && t.reason === "pack_open")
        ?.toUserId,
    ).toBe(seller.session.user.id);
    expect(transfers.find((t) => t.reason === "market_sale")).toMatchObject({
      fromUserId: seller.session.user.id,
      toUserId: buyer.session.user.id,
    });
    expect(transfers.find((t) => t.toUserId === former.session.user.id)).toMatchObject({
      reason: "legacy_acquisition",
      userCardId: null,
      fromUserId: null,
      toUserId: former.session.user.id,
    });
    expect((await getCard({ ctx: former, input: { cardId: c.id } })).ownedUserCardIds).toEqual([]);
    expect(
      await db.all(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('card_discovery', 'user_pack_card_discovery')`,
      ),
    ).toEqual([]);
    const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(user_card)`);
    expect(columns.map((c) => c.name)).not.toContain("pack_opening_id");
    expect(columns.map((c) => c.name)).not.toContain("user_id");
    await migrate(db, { migrationsFolder: migrationFolder });
    expect(await db.select().from(userCardOwnershipTransfers)).toEqual(transfers);
    // reasonの統一は履歴を書き換えず、明示的な独立処理で実行する。
    expect(await normalizeOwnershipReasons(db)).toBe(1);
    expect(await normalizeOwnershipReasons(db)).toBe(0);
    await migrate(db, { migrationsFolder: migrationFolder });
    expect(await db.select().from(userCardOwnershipTransfers)).toEqual(
      transfers.map((transfer) => ({
        ...transfer,
        reason: transfer.toUserId === former.session.user.id ? "pack_open" : transfer.reason,
      })),
    );
  } finally {
    await dispose?.();
    await rm(oldFolder, { recursive: true, force: true });
  }
}, 30000);
