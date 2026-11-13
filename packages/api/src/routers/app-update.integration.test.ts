import { expect, test } from "bun:test";
import { appUpdatePolicy } from "@wiki-collection/db/schema/index";
import { createTestDb } from "../test/create-test-db";
import { appRouter } from "./index";

test("ログイン前でもOS別の最低バージョンを数値で比較できる", async () => {
  const { db, dispose } = await createTestDb();
  try {
    const { appUpdate } = appRouter.createCaller({ db, session: null });
    const ios = (version: string) => appUpdate({ platform: "ios", version });
    expect(await ios("1.0.0")).toEqual({ required: false });
    await db.insert(appUpdatePolicy).values({ platform: "ios", minimumVersion: "1.10" });
    expect(await ios("1.9.99")).toEqual({ required: true });
    expect(await ios("1.10.0")).toEqual({ required: false });
    expect(await ios("2")).toEqual({ required: false });
    expect(await appUpdate({ platform: "android", version: "1" })).toEqual({ required: false });
    await expect(ios("invalid")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  } finally {
    await dispose();
  }
});
