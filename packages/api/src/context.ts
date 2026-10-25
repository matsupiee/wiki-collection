import type { Session } from "@wiki-collection/auth";
import type { Database } from "@wiki-collection/db";

export type Context = {
  session: Session | null;
  db: Database;
};
