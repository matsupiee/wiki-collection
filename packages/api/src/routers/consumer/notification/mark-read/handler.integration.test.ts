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

test("同じ通知を繰り返し開いても本人だけを既読にし、宛先外からの更新を拒否する", async () => {
  const [alice, bob, outsider] = await Promise.all([
    createUserContext(db),
    createUserContext(db),
    createUserContext(db),
  ]);
  const [item] = await db
    .insert(notification)
    .values({ title: "共通のお知らせ", body: "本文" })
    .returning();
  const input = { id: item!.id };
  await db
    .insert(notificationUser)
    .values([alice, bob].map((ctx) => ({ notificationId: input.id, userId: ctx.session.user.id })));
  const api = appRouter.createCaller(alice).notification;
  await expect(appRouter.createCaller(outsider).notification.markRead(input)).rejects.toMatchObject(
    { code: "NOT_FOUND" },
  );
  await expect(api.markRead({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    appRouter.createCaller({ ...alice, session: null }).notification.markRead(input),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await api.markRead(input);
  await api.markRead(input);
  expect((await api.list())[0]?.isRead).toBe(true);
  expect((await appRouter.createCaller(bob).notification.list())[0]?.isRead).toBe(false);
});
