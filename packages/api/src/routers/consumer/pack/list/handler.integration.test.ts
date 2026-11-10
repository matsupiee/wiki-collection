import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { pack } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { createTestDb } from "../../../../test/create-test-db";
import { createGenre, createPack, createUserContext } from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("pack/list", () => {
  test("販売中のパックと、まだ1つも開けていないユーザーの無料枠（10）を返す", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db, "宇宙");
    const basic = await createPack(db);
    const premium = await createPack(db, { type: "premium", genreId: g.id, priceCoins: 150 });
    const ended = await createPack(db);
    await db
      .update(pack)
      .set({ endsAt: new Date(Date.now() - 1000) })
      .where(eq(pack.id, ended.id));

    const result = await handler({ ctx });

    const ids = result.packs.map((p) => p.id);
    expect(ids).toContain(basic.id);
    expect(ids).toContain(premium.id);
    expect(ids).not.toContain(ended.id);
    expect(result.packs.find((p) => p.id === premium.id)?.genreName).toBe("宇宙");
    expect(result.freePack).toMatchObject({
      limit: 10,
      nextRefillAt: null,
      remaining: 10,
    });
  });
});
