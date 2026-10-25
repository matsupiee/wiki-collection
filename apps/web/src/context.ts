import type { Context as ApiContext } from "@wiki-collection/api/context";

import { ENV } from "./env.server";
import { getDb } from "./services";
import { createAuth } from "./services";

export async function createContext({ req }: { req: Request }): Promise<ApiContext> {
  const db = await getDb();
  const session = await (
    await createAuth(db)
  ).api.getSession({
    headers: req.headers,
  });
  return {
    db,
    session,
    // 決済サービスとの連携ができるまでは、ローカル開発（wrangler.local.jsonc で mock を指定）でだけ購入できる
    paymentMode: (ENV as { PAYMENT_MODE?: string }).PAYMENT_MODE === "mock" ? "mock" : "disabled",
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
