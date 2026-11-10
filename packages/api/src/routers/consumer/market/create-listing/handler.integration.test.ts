import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { marketListing, userCard } from "@wiki-collection/db/schema/index";
import { eq } from "drizzle-orm";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createUserContext, giveCard } from "../../../../test/fixtures";
import { marketCreateListingInputSchema } from "./route";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());
afterEach(() => setSystemTime());

describe("market/create-listing", () => {
  test("開始価格は10ptから受け付ける", () => {
    const listing = { format: "auction", userCardId: "owned", durationHours: 24 };
    expect(marketCreateListingInputSchema.safeParse({ ...listing, startPrice: 9 }).success).toBe(
      false,
    );
    expect(marketCreateListingInputSchema.safeParse({ ...listing, startPrice: 10 }).success).toBe(
      true,
    );
  });

  test("固定価格での出品を受け付けない", () => {
    expect(
      marketCreateListingInputSchema.safeParse({
        format: "fixed_price",
        userCardId: "old",
        price: 90,
      }).success,
    ).toBe(false);
  });

  test.each([1, 12, 24, 72, 168])("%i時間で出品し、終了日時を保存する", async (durationHours) => {
    setSystemTime(new Date("2026-10-25T00:00:00Z"));
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);

    const { listingId } = await handler({
      input: marketCreateListingInputSchema.parse({
        format: "auction",
        userCardId: owned.id,
        startPrice: 50,
        durationHours,
      }),
      ctx,
    });

    const [listing] = await db.select().from(marketListing).where(eq(marketListing.id, listingId));
    expect(listing?.endsAt?.getTime()).toBe(Date.now() + durationHours * 3_600_000);
    expect(listing?.startPrice).toBe(50);
    const [copy] = await db.select().from(userCard).where(eq(userCard.id, owned.id));
    expect(copy?.status).toBe("listed");
  });

  test("同じカードを二重に出品できず、他人のカードも出品できない", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    const c = await createCard(db, { genreId: g.id, rarity: "rare" });
    const owned = await giveCard(db, ctx.session.user.id, c.id);
    await handler({
      input: { format: "auction", userCardId: owned.id, startPrice: 90, durationHours: 24 },
      ctx,
    });

    await expect(
      handler({
        input: { format: "auction", userCardId: owned.id, startPrice: 80, durationHours: 24 },
        ctx,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      handler({
        input: { format: "auction", userCardId: owned.id, startPrice: 80, durationHours: 24 },
        ctx: other,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
