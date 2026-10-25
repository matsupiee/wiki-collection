import type { Session } from "@wiki-collection/auth";
import type { Database } from "@wiki-collection/db";

export type Context = {
  session: Session | null;
  db: Database;
  // mock のときだけ、決済なしで pt を購入できる（ローカル開発用）
  paymentMode: "mock" | "disabled";
};

export type ProtectedContext = Context & { session: Session };
