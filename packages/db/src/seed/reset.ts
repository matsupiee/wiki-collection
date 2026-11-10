import type { Database } from "../index";
import {
  account,
  auctionBid,
  card,
  cardDiscovery,
  coinDeposit,
  coinDepositWithdraw,
  coinProduct,
  coinPurchase,
  coinWithdraw,
  freePackAllowance,
  genre,
  marketListing,
  pack,
  packOpening,
  packSlotRate,
  rarityThreshold,
  session,
  user,
  userCard,
  verification,
} from "../schema";

export async function reset(db: Database) {
  // 外部キーの参照先より先に参照元を消す
  for (const table of [
    coinDepositWithdraw,
    coinWithdraw,
    coinDeposit,
    auctionBid,
    marketListing,
    coinPurchase,
    cardDiscovery,
    userCard,
    packOpening,
    freePackAllowance,
    packSlotRate,
    pack,
    card,
    rarityThreshold,
    genre,
    coinProduct,
    session,
    account,
    verification,
    user,
  ]) {
    await db.delete(table);
  }
}
