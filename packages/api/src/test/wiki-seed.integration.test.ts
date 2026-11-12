import { eq } from "drizzle-orm";
import { expect, test } from "bun:test";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { migrate } from "drizzle-orm/d1/migrator";
import { createDb } from "@wiki-collection/db";
import { card, user } from "@wiki-collection/db/schema/index";
import { seedWiki, selectWikiCards } from "@wiki-collection/db/seed/wiki";
import { readCardStore } from "../../../wiki-import/src/card-store";
import { cacheCommonImages } from "../shared/card/cache-common-images";
import { cardImageKey } from "@wiki-collection/db/card-image";

import { handler as getPack } from "../routers/consumer/pack/get/handler";
import { createUserContext } from "./fixtures";

test("wiki seed resets existing data, creates 500 cards and preloads higher-rarity images in R2 on repeated runs", async () => {
  const proxy = await getPlatformProxy<{
    DB: D1Database;
    CARD_IMAGES: R2Bucket;
    IMAGES: ImagesBinding;
  }>({
    configPath: path.resolve(import.meta.dirname, "../../../../apps/web/wrangler.local.jsonc"),
    persist: false,
  });
  try {
    const db = createDb({ DB: proxy.env.DB });
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../../../db/src/migrations"),
    });
    const store = await readCardStore(
      path.resolve(import.meta.dirname, "../../../db/src/seed/fixtures/ja"),
    );
    expect(selectWikiCards(store)).toHaveLength(500);
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
      expect(await proxy.env.CARD_IMAGES.head("old-image")).toBeTruthy();
      const rows = await db.select().from(card);
      expect(rows).toHaveLength(500);
      expect(new Set(rows.map((row) => row.rarity))).toEqual(
        new Set(["common", "rare", "super_rare", "legendary"]),
      );
      expect(rows.filter((c) => c.rarity === "legendary")).toHaveLength(25);
      expect(rows.filter((c) => c.rarity === "super_rare")).toHaveLength(50);
      for (const row of rows.filter((c) => c.imageUrl)) {
        expect(row.imageCredit).toBeTruthy();
        const image = await proxy.env.CARD_IMAGES.head(await cardImageKey(row.imageUrl!));
        if (
          row.rarity === "common" &&
          !rows.some((c) => c.rarity !== "common" && c.imageUrl === row.imageUrl)
        ) {
          expect(image).toBeNull();
          expect([row.imageWidth, row.imageHeight]).toEqual([null, null]);
          continue;
        }
        expect([row.imageWidth, row.imageHeight]).toEqual([3, 3]);
        expect(image?.httpMetadata?.contentType).toBe("image/webp");
        expect(image!.size).toBeLessThanOrEqual(50_000);
      }
    }
    const common = (await db.select().from(card)).find(
      (c) => c.rarity === "common" && c.imageCredit && c.imageUrl,
    )!;
    const key = await cardImageKey(common.imageUrl!);
    await proxy.env.CARD_IMAGES.delete(key);
    let downloads = 0;
    const fetchImage = async () => {
      downloads++;
      return new Response(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAIAAADZSiLoAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWNgaGCAIiwsAEOeBIE/4ZsuAAAAAElFTkSuQmCC",
          "base64",
        ),
        { headers: { "Content-Type": "image/png" } },
      );
    };
    await cacheCommonImages(db, [common.id], proxy.env.CARD_IMAGES, proxy.env.IMAGES, fetchImage);
    expect((await db.select().from(card).where(eq(card.id, common.id)))[0]?.imageWidth).toBe(3);
    await db
      .update(card)
      .set({ imageWidth: null, imageHeight: null })
      .where(eq(card.id, common.id));
    await cacheCommonImages(db, [common.id], proxy.env.CARD_IMAGES, proxy.env.IMAGES, fetchImage);
    const cached = (await db.select().from(card)).find((row) => row.id === common.id)!;
    expect([cached.imageWidth, cached.imageHeight]).toEqual([3, 3]);
    expect(downloads).toBe(1);
    expect((await proxy.env.CARD_IMAGES.head(key))?.httpMetadata?.contentType).toBe("image/webp");
    const ctx = await createUserContext(db);
    const basic = await getPack({ input: { slug: "basic" }, ctx });
    expect(
      basic.slotRates
        .slice(3)
        .map(({ rates }) =>
          Object.fromEntries(rates.map(({ rarity, percent }) => [rarity, percent])),
        ),
    ).toEqual([
      { common: 95, rare: 3.5, super_rare: 1, legendary: 0.5 },
      { common: 86, rare: 10, super_rare: 3, legendary: 1 },
    ]);
    await expect(
      seedWiki({ db, images: proxy.env.CARD_IMAGES, store: { ...store, cards: [] } }),
    ).rejects.toThrow("DBは初期化していません");
    expect(await db.select({ id: user.id }).from(user)).toEqual([{ id: ctx.session.user.id }]);
  } finally {
    await proxy.dispose();
  }
}, 120_000);
