import { expect, test } from "bun:test";
import { toggleTeamMember } from "./team-selection";
test("押した順に3枚を追加し、4枚目で既存の選択を上書きしない", () => {
  let selected: string[] = [];
  for (const id of ["a", "b", "c"]) selected = toggleTeamMember(selected, id);
  expect(selected).toEqual(["a", "b", "c"]);
  expect(toggleTeamMember(selected, "d")).toEqual(["a", "b", "c"]);
});
test("選択解除で順番を詰め、次に押したカードを末尾へ追加する", () => {
  const original = ["a", "b", "c"];
  expect(toggleTeamMember(toggleTeamMember(original, "b"), "d")).toEqual(["a", "c", "d"]);
  expect(original).toEqual(["a", "b", "c"]);
});
