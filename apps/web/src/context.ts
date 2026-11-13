import { waitUntil } from "cloudflare:workers";
import { cacheCommonImages } from "@wiki-collection/api/shared/card/cache-common-images";
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
    cacheCommonImages: (ids) => waitUntil(cacheCommonImages(db, ids, ENV.CARD_IMAGES, ENV.IMAGES)),
    localDevelopment: import.meta.env.DEV && new URL(ENV.BETTER_AUTH_URL).hostname === "localhost",
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
