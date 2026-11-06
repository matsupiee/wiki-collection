import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { battleTeam, card, userCard } from "@wiki-collection/db/schema/index";
import type { ProtectedContext } from "../../../../context";
import type { battleSaveTeamInput } from "./route";

function isConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("constraint failed") || isConstraintError(error.cause))
  );
}
const fail = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "カードが変更されました。所持状態・チーム編成を確認してください",
  });

export async function handler({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: battleSaveTeamInput;
}) {
  const valid = sql`(select count(*) from ${userCard} inner join ${card} on ${card.id} = ${userCard.cardId} where ${userCard.id} in (${sql.join(
    input.members.map((v) => sql`${v}`),
    sql`, `,
  )}) and ${userCard.userId} = ${ctx.session.user.id} and ${userCard.status} = 'owned' and ${card.articleLength} is not null) = 3`;
  const values = {
    userId: ctx.session.user.id,
    slot: input.slot,
    name: input.name,
    member1: sql<string>`case when ${valid} then ${input.members[0]} else null end`,
    member2: input.members[1]!,
    member3: input.members[2]!,
  };
  try {
    const [saved] = await ctx.db
      .insert(battleTeam)
      .values(values)
      .onConflictDoUpdate({ target: [battleTeam.userId, battleTeam.slot], set: values })
      .returning();
    return saved!;
  } catch (error) {
    if (isConstraintError(error)) throw fail();
    throw error;
  }
}
