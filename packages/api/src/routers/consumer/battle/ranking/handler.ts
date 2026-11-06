import { desc, eq } from "drizzle-orm";
import { battleDay } from "@wiki-collection/db/schema/index";
import type { ProtectedContext } from "../../../../context";
import type { battleRankingInput } from "./route";

export async function handler({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: battleRankingInput;
}) {
  const [day] = await ctx.db
    .select()
    .from(battleDay)
    .where(input.date ? eq(battleDay.date, input.date) : undefined)
    .orderBy(desc(battleDay.date))
    .limit(1);
  return day ?? null;
}
