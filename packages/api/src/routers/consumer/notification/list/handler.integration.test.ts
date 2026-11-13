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

test("配信先の通知だけを新しい順に返し、一覧表示では既読にしない", async () => {
  const [alice, bob] = await Promise.all([createUserContext(db), createUserContext(db)]);
  const api = appRouter.createCaller(alice).notification;
  expect(await api.list()).toEqual([]);
  const [older, newer, hidden] = await db
    .insert(notification)
    .values(
      ["前の通知", "新しい通知", "別の利用者宛て"].map((title, index) => ({
        title,
        body: title + "の本文",
        createdAt: new Date(1000 * index),
      })),
    )
    .returning();
  await db.insert(notificationUser).values([
    { notificationId: older!.id, userId: alice.session.user.id, isRead: true },
    { notificationId: newer!.id, userId: alice.session.user.id },
    { notificationId: hidden!.id, userId: bob.session.user.id },
  ]);
  const list = await api.list();
  expect(list.map((row) => [row.id, row.isRead])).toEqual([
    [newer!.id, false],
    [older!.id, true],
  ]);
  expect(await api.list()).toEqual(list);
  await expect(
    appRouter.createCaller({ ...alice, session: null }).notification.list(),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
