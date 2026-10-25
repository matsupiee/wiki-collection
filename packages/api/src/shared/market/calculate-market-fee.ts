export const MARKET_FEE_RATE = 0.1;

// 取引成立時に売上から差し引く手数料（1pt 未満は切り捨て）
export function calculateMarketFee(price: number): number {
  return Math.floor(price * MARKET_FEE_RATE);
}
