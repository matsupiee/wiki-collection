import { expect, test } from "bun:test";
import {
  duel,
  duelDetails,
  fight,
  historicalElements,
  type Fighter,
} from "@wiki-collection/db/battle";
import { rankTeams } from "./run-daily-battles";
const card = (element: Fighter["element"], attack = 100, defense = 30): Fighter => ({
  id: element,
  title: element,
  element,
  attack,
  defense,
});
test("内訳は弱点倍率・防御・最低0を反映する", () => {
  expect(duelDetails(card("person"), card("culture"))).toEqual({
    left: { multiplier: 2, damage: 170 },
    right: { multiplier: 1, damage: 70 },
    result: 1,
  });
  expect(duelDetails(card("general", 1, 200), card("person", 10, 200))).toEqual({
    left: { multiplier: 1, damage: 0 },
    right: { multiplier: 1, damage: 0 },
    result: 0,
  });
  expect(duelDetails(card("water"), card("fire")).left.multiplier).toBe(2);
});
test("新旧すべての相性で内訳・勝敗・総当たりの結果が一致する", () => {
  for (const a of historicalElements)
    for (const b of historicalElements) {
      const left = [card(a, 120.25), card(b, 75), card("general", 50)],
        right = [card(b, 90), card(a, 80), card("general", 90)];
      const details = left.map((c, i) => duelDetails(c, right[i]!));
      details.forEach((d, i) => expect(d.result).toBe(duel(left[i]!, right[i]!)));
      const result = Math.sign(details.reduce((n, d) => n + d.result, 0));
      expect(fight(left, right)).toBe(result);
      const ranked = rankTeams([
        { id: "a", userId: "a", player: "a", name: "a", members: left },
        { id: "b", userId: "b", player: "b", name: "b", members: right },
      ]);
      expect(ranked.find((t) => t.id === "a")).toMatchObject({
        wins: result > 0 ? 1 : 0,
        losses: result < 0 ? 1 : 0,
        draws: result === 0 ? 1 : 0,
      });
    }
});
test("番手の交換で勝敗が変わり、元の編成は変更しない", () => {
  const left = [card("person"), card("culture"), card("nature")];
  const right = [card("culture"), card("society"), card("person")];
  expect(fight(left, right)).toBe(1);
  expect(fight([left[2]!, left[0]!, left[1]!], right)).toBe(-1);
  expect(left.map((c) => c.element)).toEqual(["person", "culture", "nature"]);
});

test("4属性は人物→文化→社会→自然→人物の循環で、総合と対角は等倍", () => {
  const cycle = ["person", "culture", "society", "nature"] as const;
  for (const [i, from] of cycle.entries()) {
    for (const [j, to] of cycle.entries()) {
      expect(duelDetails(card(from), card(to)).left.multiplier).toBe(j === (i + 1) % 4 ? 2 : 1);
    }
    expect(duelDetails(card(from), card("general")).left.multiplier).toBe(1);
    expect(duelDetails(card("general"), card(from)).left.multiplier).toBe(1);
  }
});

test("科学技術のない旧編成でも5属性ルールの内訳を再現する", () => {
  const society = [card("society"), card("society"), card("society")];
  const nature = [card("nature"), card("nature"), card("nature")];
  expect(fight(society, nature, 1)).toBe(0);
  expect(fight(society, nature, 2)).toBe(1);
  expect(duelDetails(card("technology"), card("nature"), 1).left.multiplier).toBe(2);
  expect(duelDetails(card("society"), card("technology"), 1).left.multiplier).toBe(2);
});
