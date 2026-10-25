import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createPack, createUserContext } from "../../../../test/fixtures";
import { handler as openPackHandler } from "../../pack/open/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("opening/get", () => {
  test("開封した5枚をめくる順に返す", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db, "科学");
    await createCard(db, { genreId: g.id, rarity: "common", title: "水素" });
    await createCard(db, { genreId: g.id, rarity: "rare", title: "相対性理論" });
    const p = await createPack(db, {
      genreId: g.id,
      rates: [
        ...[1, 2, 3, 4].map((slot) => ({ slot, rarity: "common" as const, weight: 1 })),
        { slot: 5, rarity: "rare", weight: 1 },
      ],
    });
    const { openingId } = await openPackHandler({ input: { packId: p.id }, ctx });

    const result = await handler({ input: { openingId }, ctx });

    expect(result.pack.id).toBe(p.id);
    expect(result.opening.revealedAt).toBeNull();
    expect(result.cards.map((c) => c.slot)).toEqual([1, 2, 3, 4, 5]);
    expect(result.cards[4]?.card).toMatchObject({
      title: "相対性理論",
      rarity: "rare",
      genreName: "科学",
    });
    expect(result.cards[0]?.isNew).toBe(true);
  });

  test("他人の開封は見られない", async () => {
    const owner = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    const { openingId } = await openPackHandler({ input: { packId: p.id }, ctx: owner });
    await expect(handler({ input: { openingId }, ctx: other })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
