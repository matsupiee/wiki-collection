import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { fusionGains } from "@wiki-collection/db/battle";
import { card, cardFusion, userCard } from "@wiki-collection/db/schema/index";
import { notInTeam } from "../../../../shared/card/not-in-team";
import type { ProtectedContext } from "../../../../context";
import type { battleFuseInput } from "./route";

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

export async function handler({ ctx, input }: { ctx: ProtectedContext; input: battleFuseInput }) {
  const rows = await ctx.db
    .select({ copy: userCard, card })
    .from(userCard)
    .innerJoin(card, eq(card.id, userCard.cardId))
    .where(
      and(
        eq(userCard.userId, ctx.session.user.id),
        eq(userCard.status, "owned"),
        inArray(userCard.id, [input.baseId, input.materialId]),
      ),
    );
  const base = rows.find((r) => r.copy.id === input.baseId);
  const material = rows.find((r) => r.copy.id === input.materialId);
  if (
    !base ||
    !material ||
    base.card.articleLength === null ||
    material.card.articleLength === null
  )
    throw fail();
  const coefficient = 0.2 + (crypto.getRandomValues(new Uint32Array(1))[0]! / 0xffffffff) * 0.8;
  const gain = fusionGains(
    material.card.monthlyPageviews + material.copy.attackBonus,
    material.card.articleLength + material.copy.defenseBonus,
    coefficient,
  );
  // 検証と記録、素材消費、加算は同じ D1 batch。競合時は NOT NULL / UNIQUE 制約で全体を取り消す。
  const validMaterial = sql`exists (select 1 from ${userCard} where ${userCard.id} = ${input.materialId} and ${userCard.userId} = ${ctx.session.user.id} and ${userCard.status} = 'owned' and ${userCard.attackBonus} = ${material.copy.attackBonus} and ${userCard.defenseBonus} = ${material.copy.defenseBonus} and ${notInTeam()})`;
  const validBase = sql`exists (select 1 from ${userCard} where ${userCard.id} = ${input.baseId} and ${userCard.userId} = ${ctx.session.user.id} and ${userCard.status} = 'owned')`;
  try {
    await ctx.db.batch([
      ctx.db.insert(cardFusion).values({
        userId: ctx.session.user.id,
        baseId: sql`case when ${validMaterial} and ${validBase} then ${input.baseId} else null end`,
        materialId: input.materialId,
        coefficient,
        ...gain,
      }),
      ctx.db.update(userCard).set({ status: "fused" }).where(eq(userCard.id, input.materialId)),
      ctx.db
        .update(userCard)
        .set({
          attackBonus: sql`${userCard.attackBonus} + ${gain.attackGain}`,
          defenseBonus: sql`${userCard.defenseBonus} + ${gain.defenseGain}`,
        })
        .where(eq(userCard.id, input.baseId)),
    ]);
  } catch (error) {
    if (isConstraintError(error)) throw fail();
    throw error;
  }
  return { coefficient, ...gain };
}
