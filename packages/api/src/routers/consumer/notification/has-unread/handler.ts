import { notificationUser } from "@wiki-collection/db/schema/index";
import { and, eq } from "drizzle-orm";
import type { ProtectedContext } from "../../../../context";

export async function handler({ ctx }: { ctx: ProtectedContext }) {
  const [unread] = await ctx.db
    .select({ id: notificationUser.notificationId })
    .from(notificationUser)
    .where(
      and(eq(notificationUser.userId, ctx.session.user.id), eq(notificationUser.isRead, false)),
    )
    .limit(1);
  return Boolean(unread);
}
