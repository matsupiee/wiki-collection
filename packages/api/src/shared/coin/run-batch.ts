import type { Database } from "@wiki-collection/db";
import { TRPCError } from "@trpc/server";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";

// 書き込みを1つのトランザクションとして実行する。unique 制約違反（同時の消費・入札）は CONFLICT にする
export async function runBatch<const T extends [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]>(
  db: Database,
  queries: T,
): Promise<BatchResponse<T>>;
export async function runBatch(db: Database, queries: BatchItem<"sqlite">[]): Promise<unknown[]>;
export async function runBatch(db: Database, queries: BatchItem<"sqlite">[]) {
  if (!queries.length) return [];
  try {
    return await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "ほかの操作と重なりました。もう一度お試しください",
        cause: error,
      });
    }
    throw error;
  }
}
