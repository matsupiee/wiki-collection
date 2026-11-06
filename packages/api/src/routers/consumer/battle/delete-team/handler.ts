import { and, eq } from "drizzle-orm";
import { battleTeam } from "@wiki-collection/db/schema/index";
import type { ProtectedContext } from "../../../../context";
import type { battleDeleteTeamInput } from "./route";

export async function handler({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: battleDeleteTeamInput;
}) {
  await ctx.db
    .delete(battleTeam)
    .where(and(eq(battleTeam.userId, ctx.session.user.id), eq(battleTeam.slot, input.slot)));
  return { success: true };
}
