import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

import { operationFailed, publicErrorMessage } from "./public-error";

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return {
      ...shape,
      message: shape.data.httpStatus >= 500 ? operationFailed : publicErrorMessage(shape.message),
      data: { code: shape.data.code, httpStatus: shape.data.httpStatus },
    };
  },
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
