import { expect, test } from "bun:test";
import {
  groupFusionMaterials,
  moveTeamMember,
  toggleTeamMember,
} from "@wiki-collection/ui/lib/battle-selection";
test("3枚までの選択、解除、順序交換で元データを変更しない", () => {
  const a = ["a", "b", "c"];
  expect(toggleTeamMember(a, "d")).toEqual(a);
  expect(toggleTeamMember(a, "b")).toEqual(["a", "c"]);
  expect(moveTeamMember(a, 0, 1)).toEqual(["b", "a", "c"]);
  expect(moveTeamMember(a, 0, -1)).toEqual(a);
  expect(a).toEqual(["a", "b", "c"]);
});
test("合成の素材は編成中・ベース・未計測を除き、強化済みをまとめない", () => {
  const card = { cardId: "same", attackBonus: 0, defenseBonus: 0, inTeam: false, defense: 100 };
  const groups = groupFusionMaterials(
    [
      { ...card, id: "base" },
      { ...card, id: "team", inTeam: true },
      { ...card, id: "unknown", defense: null },
      { ...card, id: "plain" },
      { ...card, id: "boosted", attackBonus: 3 },
    ],
    "base",
  );
  expect(groups.map((g) => g.available.map((c) => c.id))).toEqual([["plain"], ["boosted"]]);
  expect(groups[0]!.ownedCount).toBe(4);
  expect(groups[1]!.strengthened).toBe(true);
});
