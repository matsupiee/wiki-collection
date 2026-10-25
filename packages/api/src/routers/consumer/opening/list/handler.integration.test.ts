import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";

import { createTestDb } from "../../../../test/create-test-db";
import { createCard, createGenre, createPack, createUserContext } from "../../../../test/fixtures";
import { handler as openPackHandler } from "../../pack/open/handler";
import { handler as revealHandler } from "../reveal/handler";
import { handler } from "./handler";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

describe("opening/list", () => {
  test("自分の開封を新しい順に、5枚の中身と演出を見終えたかと一緒に返す", async () => {
    const ctx = await createUserContext(db);
    const other = await createUserContext(db);
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    const first = await openPackHandler({ input: { packId: p.id }, ctx });
    await revealHandler({ input: { openingId: first.openingId }, ctx });
    await new Promise((r) => setTimeout(r, 5));
    const second = await openPackHandler({ input: { packId: p.id }, ctx });
    await openPackHandler({ input: { packId: p.id }, ctx: other });

    const result = await handler({ ctx });

    expect(result.openings.map((o) => o.id)).toEqual([second.openingId, first.openingId]);
    expect(result.openings.map((o) => o.revealed)).toEqual([false, true]);
    expect(result.openings[0]?.cards).toHaveLength(5);
  });
});
