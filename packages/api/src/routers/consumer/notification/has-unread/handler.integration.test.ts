import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { notification, notificationUser } from "@wiki-collection/db/schema/index";
import { createTestDb } from "../../../../test/create-test-db";
import { createUserContext } from "../../../../test/fixtures";
import { appRouter } from "../../../index";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

test("本人の最後の未読が既読になったときだけ未読表示が消える", async () => {
  const alice = await createUserContext(db);
  const bob = await createUserContext(db);
  const api = appRouter.createCaller(alice).notification;
  expect(await api.hasUnread()).toBe(false);
  const [first, last] = await db
    .insert(notification)
    .values([
      { title: "最初の通知", body: "本文" },
      { title: "次の通知", body: "本文" },
    ])
    .returning();
  await db.insert(notificationUser).values([
    { notificationId: first!.id, userId: bob.session.user.id },
    { notificationId: first!.id, userId: alice.session.user.id },
    { notificationId: last!.id, userId: alice.session.user.id },
  ]);
  await api.list();
  expect(await api.hasUnread()).toBe(true);
  await api.markRead({ id: first!.id });
  expect(await api.hasUnread()).toBe(true);
  await api.markRead({ id: last!.id });
  expect(await api.hasUnread()).toBe(false);
  expect(await appRouter.createCaller(bob).notification.hasUnread()).toBe(true);
  await expect(
    appRouter.createCaller({ ...alice, session: null }).notification.hasUnread(),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
