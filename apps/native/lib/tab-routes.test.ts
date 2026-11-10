import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";

test("メインタブにはパック・コレクション・ランキング・マーケット・マイページの画面だけを登録する", () => {
  const directory = new URL("../app/(game)/(tabs)/", import.meta.url);
  const groups = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(groups).toEqual(["(asset-ranking)", "(collection)", "(market)", "(me)", "(packs)"]);
});
