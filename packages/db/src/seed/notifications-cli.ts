import { eq } from "drizzle-orm";
import { notification, notificationUser, user } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  const email = "shiro@example.com";
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  const userId = existing?.id ?? (await createUser(db, "しろう", email));
  const id = "seed-notification-welcome";
  await db.batch([
    db
      .insert(notification)
      .values({
        id,
        title: "コレクションへようこそ",
        body: "ここであなた宛てのお知らせを確認できます。",
      })
      .onConflictDoNothing(),
    db
      .insert(notificationUser)
      .values({ userId, notificationId: id })
      .onConflictDoUpdate({
        target: [notificationUser.userId, notificationUser.notificationId],
        set: { isRead: false },
      }),
  ]);
  console.log(email + " に確認用の未読通知を用意しました。");
} finally {
  await dispose();
}
