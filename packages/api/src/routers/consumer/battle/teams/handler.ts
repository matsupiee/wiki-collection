import { asc, eq } from "drizzle-orm";
import { battleTeam } from "@wiki-collection/db/schema/index";
import type { ProtectedContext } from "../../../../context";

export async function handler({ ctx }: { ctx: ProtectedContext }) {
  return ctx.db
    .select()
    .from(battleTeam)
    .where(eq(battleTeam.userId, ctx.session.user.id))
    .orderBy(asc(battleTeam.slot));
}
