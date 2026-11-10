import { minimumAuctionPrice } from "@wiki-collection/db/enums";

function minimumIncrement(price: number) {
  if (price >= 50_000) return 1_000;
  if (price >= 10_000) return 500;
  if (price >= 5_000) return 250;
  if (price >= 1_000) return 100;
  return 10;
}

export function getMinNextBid(listing: {
  startPrice: number | null;
  currentPrice: number | null;
  bidCount: number;
}): number {
  const price = listing.currentPrice ?? listing.startPrice ?? 0;
  if (listing.bidCount === 0) return Math.max(minimumAuctionPrice, price);
  return Math.max(minimumAuctionPrice, price + minimumIncrement(price));
}
