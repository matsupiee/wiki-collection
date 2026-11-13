import { inquiryRouter } from "./consumer/inquiry/route";
import { appUpdate } from "./app-update";

import { cardAssetRankingRoute } from "./consumer/card/asset-ranking/route";
import { publicProcedure, router } from "../index";
import { cardGetRoute } from "./consumer/card/get/route";
import { cardListOwnedRoute } from "./consumer/card/list-owned/route";
import { coinGetBalanceRoute } from "./consumer/coin/get-balance/route";
import { coinListHistoryRoute } from "./consumer/coin/list-history/route";
import { marketBidRoute } from "./consumer/market/bid/route";
import { marketCancelListingRoute } from "./consumer/market/cancel-listing/route";
import { marketCreateListingRoute } from "./consumer/market/create-listing/route";
import { marketGetRoute } from "./consumer/market/get/route";
import { marketListRoute } from "./consumer/market/list/route";
import { marketListMineRoute } from "./consumer/market/list-mine/route";
import { notificationHasUnreadRoute } from "./consumer/notification/has-unread/route";
import { notificationListRoute } from "./consumer/notification/list/route";
import { notificationMarkReadRoute } from "./consumer/notification/mark-read/route";
import { openingGetRoute } from "./consumer/opening/get/route";
import { openingListRoute } from "./consumer/opening/list/route";
import { openingRevealRoute } from "./consumer/opening/reveal/route";
import { packGetRoute } from "./consumer/pack/get/route";
import { packListRoute } from "./consumer/pack/list/route";
import { packOpenRoute } from "./consumer/pack/open/route";
import { shopListProductsRoute } from "./consumer/shop/list-products/route";
import { shopPurchaseRoute } from "./consumer/shop/purchase/route";

export const appRouter = router({
  appUpdate,
  inquiry: inquiryRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  card: router({
    assetRanking: cardAssetRankingRoute,
    get: cardGetRoute,
    listOwned: cardListOwnedRoute,
  }),
  coin: router({
    getBalance: coinGetBalanceRoute,
    listHistory: coinListHistoryRoute,
  }),
  market: router({
    bid: marketBidRoute,
    cancelListing: marketCancelListingRoute,
    createListing: marketCreateListingRoute,
    get: marketGetRoute,
    list: marketListRoute,
    listMine: marketListMineRoute,
  }),
  notification: router({ hasUnread: notificationHasUnreadRoute, list: notificationListRoute, markRead: notificationMarkReadRoute }),
  opening: router({
    get: openingGetRoute,
    list: openingListRoute,
    reveal: openingRevealRoute,
  }),
  pack: router({
    get: packGetRoute,
    list: packListRoute,
    open: packOpenRoute,
  }),
  shop: router({
    listProducts: shopListProductsRoute,
    purchase: shopPurchaseRoute,
  }),
});
export type AppRouter = typeof appRouter;
