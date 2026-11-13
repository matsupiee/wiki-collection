import type { Session } from "@wiki-collection/auth";
import type { Database } from "@wiki-collection/db";

export type Context = {
  cacheCommonImages?: (cardIds: string[]) => void;
  session: Session | null;
  db: Database;
  localDevelopment?: boolean;
};

export type ProtectedContext = Context & { session: Session };
