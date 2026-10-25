import type { ProtectedContext } from "../../../../context";
import { getCoinBalance } from "../../../../shared/coin/get-coin-balance";
import type { CoinGetBalanceOutput } from "./route";

export async function handler({ ctx }: { ctx: ProtectedContext }): Promise<CoinGetBalanceOutput> {
  return getCoinBalance(ctx.db, ctx.session.user.id);
}
