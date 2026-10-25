// 次に入札できる最低額。入札がなければ開始価格、あれば現在価格の 5%（最低 1pt）上
export function getMinNextBid(listing: {
  startPrice: number | null;
  currentPrice: number | null;
}): number {
  if (listing.currentPrice === null) return listing.startPrice ?? 1;
  return listing.currentPrice + Math.max(1, Math.ceil(listing.currentPrice * 0.05));
}
