import type { Database } from "../index";
import {
  account,
  auctionBid,
  card,
  packOpeningCard,
  userCardOwnershipTransfers,
  coinDeposit,
  coinDepositWithdraw,
  coinProduct,
  coinPurchase,
  coinWithdraw,
  freePackAllowance,
  genre,
  marketListing,
  notification,
  notificationUser,
  pack,
  packOpening,
  packSlotRate,
  rarityThreshold,
  session,
  user,
  userCard,
  userQuestCompletion,
  verification,
} from "../schema";

export async function reset(db: Database) {
  // 外部キーの参照先より先に参照元を消す
  for (const table of [
    notificationUser,
    notification,
    coinDepositWithdraw,
    coinWithdraw,
    coinDeposit,
    userQuestCompletion,
    auctionBid,
    userCardOwnershipTransfers,
    marketListing,
    coinPurchase,
    packOpeningCard,
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
