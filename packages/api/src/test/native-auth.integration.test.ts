import { afterAll, beforeAll, expect, test } from "bun:test";
import { createAuth } from "@wiki-collection/auth";
import { appRouter } from "../routers";
import { createTestDb } from "./create-test-db";
let store: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  store = await createTestDb();
});
afterAll(async () => {
  await store.dispose();
});
test("Expoの認証CookieでWebと同じユーザーのAPIを利用でき、ログアウト後は失効する", async () => {
  const auth = createAuth(
    {
      BETTER_AUTH_URL: "http://localhost:3001",
      BETTER_AUTH_SECRET: "test-only-secret-native-01234567890123456789",
    },
    store.db,
  );
  const response = await auth.handler(
    new Request("http://localhost:3001/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", "expo-origin": "wiki-collection://" },
      body: JSON.stringify({
        name: "Native User",
        email: "native-auth@example.com",
        password: "password1234",
      }),
    }),
  );
  expect(response.status).toBe(200);
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookies).toContain("session_token");
  const headers = new Headers({ cookie: cookies, "expo-origin": "wiki-collection://" });
  const session = await auth.api.getSession({ headers });
  expect(session?.user.email).toBe("native-auth@example.com");
  const caller = appRouter.createCaller({ db: store.db, session, paymentMode: "disabled" });
  expect(await caller.coin.getBalance()).toEqual({ total: 0, paid: 0, free: 0 });
  expect((await caller.shop.listProducts()).purchasable).toBe(false);
  const signout = await auth.handler(
    new Request("http://localhost:3001/api/auth/sign-out", { method: "POST", headers }),
  );
  expect(signout.status).toBe(200);
  expect(await auth.api.getSession({ headers })).toBeNull();
  await expect(
    appRouter
      .createCaller({ db: store.db, session: null, paymentMode: "disabled" })
      .coin.getBalance(),
  ).rejects.toThrow();
});
test("許可していないExpo originでのアカウント作成を拒否する", async () => {
  const auth = createAuth(
    {
      BETTER_AUTH_URL: "https://wiki.example.com",
      BETTER_AUTH_SECRET: "test-only-secret-native-01234567890123456789",
    },
    store.db,
  );
  const response = await auth.handler(
    new Request("https://wiki.example.com/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "expo-origin": "untrusted-app://",
        cookie: "better-auth.session_token=untrusted",
      },
      body: JSON.stringify({
        name: "Bad Origin",
        email: "untrusted@example.com",
        password: "password1234",
      }),
    }),
  );
  expect(response.status).toBe(403);
});
