const reasons = {
  "ログインしてください。": "signInRequired",
  "pt が足りません": "shortfall",
  このオークションには入札できません: "biddingClosed",
  このカードは出品できません: "cardNotListable",
  このパックに入るカードがありません: "packEmpty",
  このパックの排出条件を満たすカードがありません: "poolEmpty",
  この出品は取り下げられません: "cannotCancel",
  すでに最高額で入札しています: "leadingAlready",
  "ほかの操作と重なりました。もう一度お試しください": "conflict",
  まだ手に入れていないカードです: "notOwned",
  カードが見つかりません: "cardMissing",
  パックが見つかりません: "packMissing",
  出品が見つかりません: "listingMissing",
  商品が見つかりません: "productMissing",
  排出対象が更新されました: "poolChanged",
  無料パックの回復までお待ちください: "waitRefill",
  "現在 pt は購入できません": "shopClosed",
  自分の出品には入札できません: "ownListing",
  開封の記録が見つかりません: "openingMissing",
} as const;

export const operationFailed = "処理できませんでした。時間をおいてもう一度お試しください。";

export function publicErrorReason(message: unknown) {
  if (message === "Authentication required") return { key: "signInRequired" } as const;
  if (typeof message === "string" && Object.hasOwn(reasons, message)) {
    return { key: reasons[message as keyof typeof reasons] };
  }
  const bid = typeof message === "string" && /^(\d{1,16})pt 以上で入札してください$/u.exec(message);
  if (bid) return { key: "minimumBid", amount: bid[1]! } as const;
  return { key: "operationFailed" } as const;
}

export function publicErrorMessage(message: unknown, fallback = operationFailed): string {
  const reason = publicErrorReason(message);
  if (reason.key === "operationFailed") return fallback;
  if (reason.key === "signInRequired") return "ログインしてください。";
  return String(message);
}
