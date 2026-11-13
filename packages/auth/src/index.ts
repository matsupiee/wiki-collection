import { installationAuth } from "./installation";
import { expo } from "@better-auth/expo";
import { browserOrigins } from "./origins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@wiki-collection/db";
import * as schema from "@wiki-collection/db/schema/auth";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
};

export function createAuth(
  env: AuthConfig,
  database: Database,
  verifyAppleToken?: Parameters<typeof installationAuth>[1],
) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [...browserOrigins(env.BETTER_AUTH_URL), "wiki-collection://"],
    disabledPaths: ["/update-user", "/change-email", "/delete-user"],
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [installationAuth(database, verifyAppleToken), expo(), tanstackStartCookies()],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
