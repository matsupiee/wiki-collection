import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { userCard } from "@wiki-collection/db/schema/index";
import { and, eq } from "drizzle-orm";

import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("card/redeem-duplicates", () => {
  test("各カードを1枚ずつ残して残りを還元する", async () => {
    const ctx = await createUserContext(db);
    const userId = ctx.session.user.id;
    const g = await createGenre(db);
    const common = await createCard(db, { genreId: g.id, rarity: "common" });
    const rare = await createCard(db, { genreId: g.id, rarity: "rare" });
    const single = await createCard(db, { genreId: g.id, rarity: "legendary" });
    for (let i = 0; i < 3; i++) await giveCard(db, userId, common.id);
    for (let i = 0; i < 2; i++) await giveCard(db, userId, rare.id);
    await giveCard(db, userId, single.id);

    expect(await handler({ ctx })).toEqual({ count: 3, points: 1 + 1 + 15 });

    const owned = await db
      .select()
      .from(userCard)
      .where(and(eq(userCard.userId, userId), eq(userCard.status, "owned")));
    expect(owned.map((o) => o.cardId).sort()).toEqual([common.id, rare.id, single.id].sort());
    expect((await getCoinBalance(db, userId)).total).toBe(17);
  });

  test("重複がなければ何もしない", async () => {
    const ctx = await createUserContext(db);
    expect(await handler({ ctx })).toEqual({ count: 0, points: 0 });
  });
});
