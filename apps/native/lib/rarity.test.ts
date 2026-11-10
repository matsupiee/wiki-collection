import { expect, test } from "bun:test";
import { rarities } from "@wiki-collection/db/enums";
import { highestOpeningRarity } from "./rarity";

for (const [index, highest] of rarities.entries()) {
  test(`opening uses the highest rarity: ${highest}`, () => {
    const cards = rarities.slice(0, index + 1).map((rarity) => ({ card: { rarity } }));
    expect(highestOpeningRarity(cards)).toBe(highest);
    expect(highestOpeningRarity(cards.reverse())).toBe(highest);
  });
}
