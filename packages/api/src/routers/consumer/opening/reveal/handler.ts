import { packOpening } from "@wiki-collection/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { ProtectedContext } from "../../../../context";
import type { OpeningRevealInput, OpeningRevealOutput } from "./route";

export async function handler({
  input,
  ctx,
}: {
  input: OpeningRevealInput;
  ctx: ProtectedContext;
}): Promise<OpeningRevealOutput> {
  const [found] = await ctx.db
    .select()
    .from(packOpening)
    .where(and(eq(packOpening.id, input.openingId), eq(packOpening.userId, ctx.session.user.id)));
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "開封の記録が見つかりません" });
  if (found.revealedAt) return { revealedAt: found.revealedAt.toISOString() };

  const revealedAt = new Date();
  await ctx.db.update(packOpening).set({ revealedAt }).where(eq(packOpening.id, found.id));
  return { revealedAt: revealedAt.toISOString() };
}
