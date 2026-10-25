export const rarities = ["common", "uncommon", "rare", "double_rare", "legendary"] as const;
export type Rarity = (typeof rarities)[number];

export const packTypes = ["free_basic", "premium"] as const;
export type PackType = (typeof packTypes)[number];

export const packPayments = ["free_initial", "free_daily", "coin"] as const;
export type PackPayment = (typeof packPayments)[number];

export const userCardStatuses = ["owned", "listed", "redeemed"] as const;
export type UserCardStatus = (typeof userCardStatuses)[number];

export const listingFormats = ["fixed_price", "auction"] as const;
export type ListingFormat = (typeof listingFormats)[number];

export const listingStatuses = ["active", "sold", "cancelled", "expired"] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const bidStatuses = ["leading", "outbid", "won"] as const;
export type BidStatus = (typeof bidStatuses)[number];

export const coinDepositSources = [
  "purchase",
  "card_redeem",
  "market_sale",
  "bid_refund",
  "admin_grant",
] as const;
export type CoinDepositSource = (typeof coinDepositSources)[number];

export const coinWithdrawPurposes = [
  "pack_open",
  "market_buy",
  "auction_bid",
  "admin_revoke",
] as const;
export type CoinWithdrawPurpose = (typeof coinWithdrawPurposes)[number];

export const purchaseProviders = ["mock", "stripe", "app_store", "google_play"] as const;
export type PurchaseProvider = (typeof purchaseProviders)[number];

export const purchaseStatuses = ["pending", "completed", "failed", "refunded"] as const;
export type PurchaseStatus = (typeof purchaseStatuses)[number];
