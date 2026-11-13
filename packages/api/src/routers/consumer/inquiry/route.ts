import { TRPCError } from "@trpc/server";
import { inquiry, supportAgent } from "@wiki-collection/db/schema/index";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { ProtectedContext } from "../../../context";
import { protectedProcedure, router } from "../../../index";

async function isAgent(ctx: ProtectedContext) {
  const rows = await ctx.db
    .select()
    .from(supportAgent)
    .where(eq(supportAgent.userId, ctx.session.user.id));
  return rows.length > 0;
}

const agentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!(await isAgent(ctx))) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

const message = z.string().trim().min(1).max(2000);
const fields = {
  id: inquiry.id,
  body: inquiry.body,
  answer: inquiry.answer,
  createdAt: inquiry.createdAt,
  answeredAt: inquiry.answeredAt,
};

export const inquiryRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db
      .select(fields)
      .from(inquiry)
      .where(eq(inquiry.userId, ctx.session.user.id))
      .orderBy(desc(inquiry.createdAt), desc(inquiry.id));
    return { items, canAnswer: await isAgent(ctx) };
  }),
  submit: protectedProcedure.input(z.object({ body: message })).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(inquiry).values({ userId: ctx.session.user.id, body: input.body });
  }),
  pending: agentProcedure.query(({ ctx }) =>
    ctx.db
      .select(fields)
      .from(inquiry)
      .where(isNull(inquiry.answer))
      .orderBy(asc(inquiry.createdAt), asc(inquiry.id)),
  ),
  answer: agentProcedure
    .input(z.object({ id: z.string().min(1), answer: message }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(inquiry)
        .set({ answer: input.answer, answeredAt: new Date() })
        .where(and(eq(inquiry.id, input.id), isNull(inquiry.answer)))
        .returning({ id: inquiry.id });
      if (!updated.length) throw new TRPCError({ code: "CONFLICT" });
    }),
});
