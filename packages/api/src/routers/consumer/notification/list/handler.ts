import { notification, notificationUser } from "@wiki-collection/db/schema/index";
import { desc, eq } from "drizzle-orm";
import type { ProtectedContext } from "../../../../context";

export async function handler({ ctx }: { ctx: ProtectedContext }) {
  const rows = await ctx.db
    .select({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
      isRead: notificationUser.isRead,
    })
    .from(notificationUser)
    .innerJoin(notification, eq(notificationUser.notificationId, notification.id))
    .where(eq(notificationUser.userId, ctx.session.user.id))
    .orderBy(desc(notification.createdAt), desc(notification.id));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
