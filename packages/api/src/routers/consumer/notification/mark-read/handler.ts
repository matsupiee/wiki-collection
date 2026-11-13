import { TRPCError } from "@trpc/server";
import { notificationUser } from "@wiki-collection/db/schema/index";
import { and, eq } from "drizzle-orm";
import type { ProtectedContext } from "../../../../context";

import type { NotificationMarkReadInput } from "./route";

export async function handler({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: NotificationMarkReadInput;
}) {
  const [recipient] = await ctx.db
    .update(notificationUser)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationUser.userId, ctx.session.user.id),
        eq(notificationUser.notificationId, input.id),
      ),
    )
    .returning({ isRead: notificationUser.isRead });
  if (!recipient) throw new TRPCError({ code: "NOT_FOUND" });
  return recipient;
}
