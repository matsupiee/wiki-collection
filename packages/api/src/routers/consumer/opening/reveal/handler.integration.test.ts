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

describe("opening/reveal", () => {
  test("開封結果に到達した日時を記録し、2回目以降は最初の日時を返す", async () => {
    const ctx = await createUserContext(db);
    const g = await createGenre(db);
    await createCard(db, { genreId: g.id, rarity: "common" });
    const p = await createPack(db, { genreId: g.id });
    const { openingId } = await openPackHandler({ input: { packId: p.id }, ctx });

    const first = await handler({ input: { openingId }, ctx });
    const second = await handler({ input: { openingId }, ctx });
    expect(second.revealedAt).toBe(first.revealedAt);
  });

  test("他人の開封は記録できない", async () => {
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
