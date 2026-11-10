import { hashPassword } from "better-auth/crypto";
import type { Database } from "../index";
import { account, user } from "../schema";

export async function createUser(db: Database, name: string, email: string) {
  const id = crypto.randomUUID().replaceAll("-", "");
  await db.insert(user).values({ id, name, email, emailVerified: true });
  await db.insert(account).values({
    id: crypto.randomUUID().replaceAll("-", ""),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword("password1234"),
    updatedAt: new Date(),
  });
  return id;
}
