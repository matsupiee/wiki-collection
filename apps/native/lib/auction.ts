// 締切付近は他の利用者による延長を秒単位で反映する。
export function auctionRefreshInterval(endsAt: string) {
  const remaining = Date.parse(endsAt) - Date.now();
  return remaining <= 15_000 ? 1000 : Math.min(15_000, remaining - 10_000);
}
