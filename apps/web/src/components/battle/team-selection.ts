// 選択順が対戦順。選択済みを押すと解除し、空いた枠へ次のカードを追加する。
export function toggleTeamMember(members: string[], id: string): string[] {
  if (members.includes(id)) return members.filter((member) => member !== id);
  return members.length < 3 ? [...members, id] : members;
}
