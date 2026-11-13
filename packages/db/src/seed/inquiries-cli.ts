import { eq } from "drizzle-orm";
import { inquiry, supportAgent, user } from "../schema";
import { createUser } from "./create-user";
import { openLocalDb } from "./local-db";

const { db, dispose } = await openLocalDb();
try {
  async function account(email: string, name: string) {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    return existing?.id ?? (await createUser(db, name, email));
  }
  const owner = await account("shiro@example.com", "しろう");
  const agent = await account("support-test@example.com", "運営テスト");
  await db.batch([
    db.insert(supportAgent).values({ userId: agent }).onConflictDoNothing(),
    db
      .insert(inquiry)
      .values({ id: "seed-inquiry", userId: owner, body: "購入履歴の確認方法を教えてください。" })
      .onConflictDoUpdate({ target: inquiry.id, set: { answer: null, answeredAt: null } }),
  ]);
} finally {
  await dispose();
}
