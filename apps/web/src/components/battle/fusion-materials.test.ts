import { expect, test } from "bun:test";
import { groupFusionMaterials } from "./fusion-materials";
import type { BattleCard } from "./card-picker";
const copy = (id: string, changes: Partial<BattleCard> = {}): BattleCard => ({
  id,
  cardId: "same",
  title: "同じカード",
  imageUrl: null,
  attack: 100,
  defense: 100,
  element: "general",
  attackBonus: 0,
  defenseBonus: 0,
  inTeam: false,
  ...changes,
});
test("所持5枚のうちベースと編成中を除いた3枚だけが素材候補", () => {
  const groups = groupFusionMaterials(
    [copy("a"), copy("b"), copy("c"), copy("d"), copy("e", { inTeam: true })],
    "a",
  );
  expect(groups).toHaveLength(1);
  expect(groups[0]!.ownedCount).toBe(5);
  expect(groups[0]!.available.map((c) => c.id)).toEqual(["b", "c", "d"]);
});
test("同名の別カードは別枠、強化済みは個別、未計測や使用不可だけの枠は非表示", () => {
  const groups = groupFusionMaterials(
    [
      copy("a"),
      copy("b", { cardId: "other" }),
      copy("c", { attackBonus: 1 }),
      copy("d", { attackBonus: 1 }),
      copy("e", { cardId: "unknown", defense: null }),
      copy("f", { cardId: "team", inTeam: true }),
    ],
    "base",
  );
  expect(groups).toHaveLength(4);
  expect(groups.filter((g) => g.strengthened).map((g) => g.available.map((c) => c.id))).toEqual([
    ["c"],
    ["d"],
  ]);
});
