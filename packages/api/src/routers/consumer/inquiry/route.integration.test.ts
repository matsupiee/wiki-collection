import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Database } from "@wiki-collection/db";
import { supportAgent } from "@wiki-collection/db/schema/index";
import { createTestDb } from "../../../test/create-test-db";
import { createUserContext } from "../../../test/fixtures";
import { appRouter } from "../../index";

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => ({ db, dispose } = await createTestDb()));
afterAll(() => dispose());

test("本人だけの履歴、担当者の受付一覧と一度だけの回答", async () => {
  const owner = await createUserContext(db);
  const staff = await createUserContext(db);
  const customer = appRouter.createCaller(owner).inquiry;
  const agent = appRouter.createCaller(staff).inquiry;
  await db.insert(supportAgent).values({ userId: staff.session.user.id });
  for (const body of ["  ", "あ".repeat(2001)]) {
    await expect(customer.submit({ body })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  }
  await customer.submit({ body: " テスト " });
  const [ticket] = (await customer.mine()).items;
  expect(ticket?.body).toBe("テスト");
  expect(await agent.mine()).toEqual({ items: [], canAnswer: true });
  expect(await agent.pending()).toEqual([ticket!]);
  const reply = { id: ticket!.id, answer: " 回答 " };
  await expect(customer.pending()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(customer.answer(reply)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(agent.answer({ ...reply, answer: " " })).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
  await agent.answer(reply);
  await expect(agent.answer(reply)).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await agent.pending()).toEqual([]);
  expect((await customer.mine()).items[0]?.answer).toBe("回答");
  const guest = appRouter.createCaller({ ...owner, session: null }).inquiry;
  await expect(guest.submit({ body: "テスト" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(guest.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
