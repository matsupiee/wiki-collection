// shiro の無料枠を空にし、15秒後に1パック回復する状態を再現する。
import { eq } from "drizzle-orm";
import { freePackAllowance, user } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  const [shiro] = await db.select().from(user).where(eq(user.email, "shiro@example.com"));
  const userId = shiro?.id ?? (await createUser(db, "しろう", "shiro@example.com"));
  const fullAt = Date.now() + 90 * 60_000 + 15_000;
  await db
    .insert(freePackAllowance)
    .values({ userId, fullAt })
    .onConflictDoUpdate({ target: freePackAllowance.userId, set: { fullAt } });
  console.log("shiro@example.com の無料パックは残り0です。15秒後に1パック回復します。");
} finally {
  await dispose();
}
