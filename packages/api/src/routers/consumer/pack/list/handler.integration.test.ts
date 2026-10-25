import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
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
afterEach(() => setSystemTime());

describe("pack/list", () => {
  test("販売中のパックと、まだ1つも開けていないユーザーの無料枠（20 + 10）を返す", async () => {
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
      initialRemaining: 20,
      dailyRemaining: 10,
      remaining: 30,
    });
  });

  test("毎日の無料枠は日本時間の 0 時に切り替わる", async () => {
    setSystemTime(new Date("2026-10-25T14:59:00Z")); // 日本時間 23:59
    const ctx = await createUserContext(db);
    const result = await handler({ ctx });
    expect(result.freePack.dailyResetsAt).toBe("2026-10-25T15:00:00.000Z");
  });
});
