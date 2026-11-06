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
        inArray(userCard.id, [input.baseId, ...input.materialIds]),
      ),
    );
  const base = rows.find((r) => r.copy.id === input.baseId);
  if (!base || base.card.articleLength === null || rows.length !== input.materialIds.length + 1)
    throw fail();
  const materials = input.materialIds.map((id) => rows.find((r) => r.copy.id === id)!);
  if (materials.some((m) => m.card.articleLength === null)) throw fail();
  const gains = materials.map((material) => {
    const coefficient = 0.2 + (crypto.getRandomValues(new Uint32Array(1))[0]! / 0xffffffff) * 0.8;
    return {
      material,
      coefficient,
      ...fusionGains(
        material.card.monthlyPageviews + material.copy.attackBonus,
        material.card.articleLength! + material.copy.defenseBonus,
        coefficient,
      ),
    };
  });
  const total = gains.reduce(
    (sum, g) => ({
      attackGain: sum.attackGain + g.attackGain,
      defenseGain: sum.defenseGain + g.defenseGain,
    }),
    { attackGain: 0, defenseGain: 0 },
  );
  const validBase = sql`exists (select 1 from ${userCard} where ${userCard.id} = ${input.baseId} and ${userCard.userId} = ${ctx.session.user.id} and ${userCard.status} = 'owned')`;
  // 各素材を個別の文で検証し、D1の変数上限を超えないようにする。
  // 全履歴の検証・素材消費・加算は1つのbatch。1枚でも競合・不正があれば全体を取り消す。
  const inserts = gains.map(({ material, coefficient, attackGain, defenseGain }) => {
    const validMaterial = sql`exists (select 1 from ${userCard} where ${userCard.id} = ${material.copy.id} and ${userCard.userId} = ${ctx.session.user.id} and ${userCard.status} = 'owned' and ${userCard.attackBonus} = ${material.copy.attackBonus} and ${userCard.defenseBonus} = ${material.copy.defenseBonus} and ${notInTeam()})`;
    return ctx.db.insert(cardFusion).values({
      userId: ctx.session.user.id,
      baseId: sql`case when ${validMaterial} and ${validBase} then ${input.baseId} else null end`,
      materialId: material.copy.id,
      coefficient,
      attackGain,
      defenseGain,
    });
  });
  try {
    await ctx.db.batch([
      inserts[0]!,
      ...inserts.slice(1),
      ctx.db
        .update(userCard)
        .set({ status: "fused" })
        .where(inArray(userCard.id, input.materialIds)),
      ctx.db
        .update(userCard)
        .set({
          attackBonus: sql`${userCard.attackBonus} + ${total.attackGain}`,
          defenseBonus: sql`${userCard.defenseBonus} + ${total.defenseGain}`,
        })
        .where(eq(userCard.id, input.baseId)),
    ]);
  } catch (error) {
    if (isConstraintError(error)) throw fail();
    throw error;
  }
  return {
    coefficient: gains.length === 1 ? gains[0]!.coefficient : undefined,
    materialCount: gains.length,
    ...total,
  };
}
