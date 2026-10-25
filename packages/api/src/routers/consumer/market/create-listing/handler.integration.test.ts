import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { marketListing, userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("market/create-listing", () => {
  test("フリマ形式で出品すると、カードは出品中になる", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);

    const { listingId } = await handler({
      input: { format: "fixed_price", userCardId: owned.id, price: 90 },
      ctx,
    });

    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing).toMatchObject({
      format: "fixed_price",
      status: "active",
      price: 90,
      cardId: c.id,
    });
    const [after] = await db.select().from(userCard).where(eq(userCard.id, owned.id));
    expect(after?.status).toBe("listed");
  });

  test("オークション形式は期間から終了日時を決める", async () => {
    setSystemTime(new Date("2026-10-25T00:00:00Z"));
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);

    const { listingId } = await handler({
      input: { format: "auction", userCardId: owned.id, startPrice: 50, durationHours: 72 },
      ctx,
    });

    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing?.endsAt?.toISOString()).toBe("2026-10-28T00:00:00.000Z");
    expect(listing?.startPrice).toBe(50);
  });

  test("同じカードを二重に出品できず、他人のカードも出品できない", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);
    await handler({ input: { format: "fixed_price", userCardId: owned.id, price: 90 }, ctx });

    await expect(
      handler({ input: { format: "fixed_price", userCardId: owned.id, price: 80 }, ctx }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      handler({ input: { format: "fixed_price", userCardId: owned.id, price: 80 }, ctx: other }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
