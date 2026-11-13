import { afterAll, beforeAll, expect, test } from "bun:test";
import { createAuth } from "@wiki-collection/auth";
import { createPack, createGenre, createCard } from "./fixtures";
import { coinDeposit, packOpening, userCard } from "@wiki-collection/db/schema/index";
import { appRouter } from "../routers";
import { createTestDb } from "./create-test-db";

let store: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof createAuth>;
beforeAll(async () => {
  store = await createTestDb();
  auth = createAuth(
    {
      BETTER_AUTH_URL: "http://localhost:3001",
      BETTER_AUTH_SECRET: "test-only-secret-native-01234567890123456789",
    },
    store.db,
    async (token, nonce) => {
      if (token !== "signed-" + nonce) throw new Error("invalid credential");
      return "verified-apple-user";
    },
  );
});
afterAll(() => store.dispose());

function request(path: string, body: unknown, cookie = "", origin = "wiki-collection://") {
  return auth.handler(
    new Request("http://localhost:3001/api/auth/" + path, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "expo-origin": origin },
      body: JSON.stringify(body),
    }),
  );
}
function cookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
async function start(secret: string) {
  const res = await request("installation/start", { secret });
  expect(res.status).toBe(200);
  const headers = new Headers({ cookie: cookie(res) });
  const session = await auth.api.getSession({ headers });
  expect(session).toBeTruthy();
  return { cookie: cookie(res), session: session!, secret };
}
async function authorize(device: Awaited<ReturnType<typeof start>>, mode: "link" | "restore") {
  const challenge = await request("installation/challenge", {}, device.cookie);
  expect(challenge.status).toBe(200);
  const { nonce } = (await challenge.json()) as { nonce: string };
  const body = { mode, nonce, secret: device.secret, token: "signed-" + nonce };
  return { response: await request("installation/apple", body, device.cookie), body };
}
test("ゲストの再ログイン・再インストール・Apple連携と履歴の復元", async () => {
  const first = await start("a".repeat(64));
  const id = first.session.user.id;
  await store.db
    .insert(coinDeposit)
    .values({ userId: id, amount: 123, source: "admin_grant", isPaid: false });
  expect((await start(first.secret)).session.user.id).toBe(id);
  const pack = await createPack(store.db);
  const genre = await createGenre(store.db);
  const card = await createCard(store.db, { genreId: genre.id, rarity: "rare" });
  const [opening] = await store.db
    .insert(packOpening)
    .values({
      userId: id,
      packId: pack.id,
      payment: "free_initial",
      revealedAt: new Date(),
    })
    .returning();
  await store.db
    .insert(userCard)
    .values({ userId: id, cardId: card.id, packOpeningId: opening!.id });
  const history = await appRouter
    .createCaller({ db: store.db, session: first.session })
    .opening.list();
  expect(history.openings[0]?.cards[0]?.cardId).toBe(card.id);
  const fresh = await start("b".repeat(64));
  expect(fresh.session.user.id).not.toBe(id);
  expect((await authorize(fresh, "restore")).response.status).toBe(404);
  const linked = await authorize(first, "link");
  expect(linked.response.status).toBe(200);
  expect((await request("installation/apple", linked.body, first.cookie)).status).toBe(401);
  expect((await authorize(fresh, "link")).response.status).toBe(409);
  const restore = await authorize(fresh, "restore");
  expect(restore.response.status).toBe(200);
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookie(restore.response) }),
  });
  expect(session?.user.id).toBe(id);
  expect(await appRouter.createCaller({ db: store.db, session }).opening.list()).toEqual(history);
  expect((await start(fresh.secret)).session.user.id).toBe(id);
  expect(await appRouter.createCaller({ db: store.db, session }).coin.getBalance()).toEqual({
    total: 123,
    free: 123,
    paid: 0,
  });
  expect(await auth.api.getSession({ headers: new Headers({ cookie: fresh.cookie }) })).toBeNull();
  expect((await request("installation/request-deletion", {}, first.cookie)).status).toBe(200);
});
test("未許可の origin と無効なApple署名を拒否する", async () => {
  expect(
    (await request("installation/start", { secret: "c".repeat(64) }, "test=1", "untrusted-app://"))
      .status,
  ).toBe(403);
  const device = await start("d".repeat(64));
  const { nonce } = (await (await request("installation/challenge", {}, device.cookie)).json()) as {
    nonce: string;
  };
  expect(
    (
      await request(
        "installation/apple",
        { secret: device.secret, mode: "link", token: "invalid", nonce },
        device.cookie,
      )
    ).status,
  ).toBe(401);
});
