import { expect, test } from "bun:test";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { migrate } from "drizzle-orm/d1/migrator";
import { createDb } from "@wiki-collection/db";
import { card, user } from "@wiki-collection/db/schema/index";
import { seedWiki, selectWikiCards } from "@wiki-collection/db/seed/wiki";
import { DATA_DIR, readCardStore } from "../../../wiki-import/src/card-store";
import { cardImageKey } from "@wiki-collection/db/card-image";

import { handler as getPack } from "../routers/consumer/pack/get/handler";
import { createUserContext } from "./fixtures";

test("wiki seed resets existing data, creates 100 cards and stores every image in R2 on repeated runs", async () => {
  const proxy = await getPlatformProxy<{ DB: D1Database; CARD_IMAGES: R2Bucket }>({
    configPath: path.resolve(import.meta.dirname, "../../../../apps/web/wrangler.local.jsonc"),
    persist: false,
  });
  try {
    const db = createDb({ DB: proxy.env.DB });
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../../../db/src/migrations"),
    });
    const store = await readCardStore(DATA_DIR);
    expect(selectWikiCards(store)).toHaveLength(100);
    for (let run = 0; run < 2; run++) {
      await db.insert(user).values({ id: "old-user", name: "old", email: "old@example.com" });
      await proxy.env.CARD_IMAGES.put("old-image", "stale");
      await seedWiki({
        db,
        images: proxy.env.CARD_IMAGES,
        store,
        fetch: async () =>
          new Response(
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAIAAADZSiLoAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWNgaGCAIiwsAEOeBIE/4ZsuAAAAAElFTkSuQmCC",
              "base64",
            ),
            { headers: { "Content-Type": "image/png" } },
          ),
        sleep: async () => {},
      });
      expect(await db.select().from(user)).toHaveLength(0);
      expect(await proxy.env.CARD_IMAGES.head("old-image")).toBeNull();
      const rows = await db.select().from(card);
      expect(rows).toHaveLength(100);
      for (const row of rows) {
        expect(row.imageCredit).toBeTruthy();
        const image = await proxy.env.CARD_IMAGES.head(await cardImageKey(row.imageUrl!));
        expect(image?.httpMetadata?.contentType).toBe("image/webp");
        expect(image!.size).toBeLessThanOrEqual(50_000);
      }
    }
    const ctx = await createUserContext(db);
    const basic = await getPack({ input: { slug: "basic" }, ctx });
    expect(
      basic.slotRates
        .slice(3)
        .map(({ rates }) =>
          Object.fromEntries(rates.map(({ rarity, percent }) => [rarity, percent])),
        ),
    ).toEqual([
      { uncommon: 95, rare: 3.5, double_rare: 1, legendary: 0.5 },
      { uncommon: 86, rare: 10, double_rare: 3, legendary: 1 },
    ]);
    await expect(
      seedWiki({ db, images: proxy.env.CARD_IMAGES, store: { ...store, cards: [] } }),
    ).rejects.toThrow("DBは初期化していません");
    expect(await db.select({ id: user.id }).from(user)).toEqual([{ id: ctx.session.user.id }]);
    await expect(
      seedWiki({
        db,
        images: proxy.env.CARD_IMAGES,
        store,
        fetch: async () => new Response(null, { status: 404 }),
        sleep: async () => {},
      }),
    ).rejects.toThrow("画像保存に失敗");
    expect(await db.select().from(card)).toHaveLength(0);
  } finally {
    await proxy.dispose();
  }
}, 120_000);
