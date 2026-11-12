const publicMessages = new Set([
  "ログインしてください。",
  "pt が足りません",
  "このオークションには入札できません",
  "このカードは出品できません",
  "このパックに入るカードがありません",
  "このパックの排出条件を満たすカードがありません",
  "この出品は取り下げられません",
  "すでに最高額で入札しています",
  "ほかの操作と重なりました。もう一度お試しください",
  "まだ手に入れていないカードです",
  "カードが見つかりません",
  "パックが見つかりません",
  "出品が見つかりません",
  "商品が見つかりません",
  "排出対象が更新されました",
  "無料パックの回復までお待ちください",
  "現在 pt は購入できません",
  "自分の出品には入札できません",
  "開封の記録が見つかりません",
]);

export const operationFailed = "処理できませんでした。時間をおいてもう一度お試しください。";

export function publicErrorMessage(message: unknown, fallback = operationFailed): string {
  if (message === "Authentication required") return "ログインしてください。";
  if (typeof message === "string" && publicMessages.has(message)) return message;
  const bid = typeof message === "string" && /^(\d{1,16})pt 以上で入札してください$/u.exec(message);
  if (bid) return `${bid[1]}pt 以上で入札してください`;
  return fallback;
}
