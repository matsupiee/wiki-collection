import { expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { publicProcedure, router } from "../index";
import { operationFailed, publicErrorMessage } from "../public-error";

const sql = 'Failed query: insert into "free_pack_allowance" values (?)';

test("内部例外と入力エラーの詳細を HTTP レスポンスに含めない", async () => {
  for (const error of [new Error(sql), new TRPCError({ code: "BAD_REQUEST", message: sql })]) {
    const response = await fetchRequestHandler({
      endpoint: "/api",
      req: new Request("http://localhost/api/open"),
      router: router({
        open: publicProcedure.query(() => {
          throw error;
        }),
      }),
      createContext: () => ({ session: null, paymentMode: "mock" as const, db: {} as never }),
    });
    const body = await response.json();
    expect(body).toMatchObject({ error: { message: operationFailed } });
    expect(body).not.toHaveProperty("error.data.stack");
    expect(JSON.stringify(body)).not.toContain("free_pack_allowance");
  }
});

test("旧APIのエラーも表示前に判定し、既知の案内だけを通す", () => {
  for (const message of [sql, "100pt 以上で入札してください\n" + sql, undefined]) {
    expect(publicErrorMessage(message)).toBe(operationFailed);
  }
  for (const message of ["pt が足りません", "100pt 以上で入札してください"]) {
    expect(publicErrorMessage(message)).toBe(message);
  }
});
