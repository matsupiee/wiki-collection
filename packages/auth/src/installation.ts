import type { Database } from "@wiki-collection/db";
import { installation, user, verification } from "@wiki-collection/db/schema/auth";
import { inquiry } from "@wiki-collection/db/schema/inquiry";
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

const issuer = "https://appleid.apple.com";
const keys = createRemoteJWKSet(new URL(issuer + "/auth/keys"));
const secret = z.string().regex(/^[a-f0-9]{64}$/);
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyApple(
  token: string,
  nonce: string,
  verificationKeys: Parameters<typeof jwtVerify>[1] = keys,
) {
  const { payload } = await jwtVerify(token, verificationKeys, {
    issuer,
    audience: "com.matsupiee.wikicollection",
    algorithms: ["RS256"],
    requiredClaims: ["sub", "exp", "nonce"],
    maxTokenAge: "10m",
  });
  if (!payload.sub || payload.nonce !== nonce) throw new Error("Invalid Apple credential");
  return payload.sub;
}

export function installationAuth(db: Database, verify = verifyApple) {
  return {
    id: "installation",
    endpoints: {
      startInstallation: createAuthEndpoint(
        "/installation/start",
        {
          method: "POST",
          body: z.object({ secret }),
        },
        async (ctx) => {
          const key = await digest(ctx.body.secret);
          const owner = async () =>
            (
              await db
                .select({ id: installation.userId })
                .from(installation)
                .where(eq(installation.digest, key))
                .get()
            )?.id;
          let id = await owner();
          if (!id) {
            const newId = crypto.randomUUID();
            try {
              await db.batch([
                db.insert(user).values({
                  id: newId,
                  name: "ゲスト-" + newId.slice(0, 8),
                  email: newId + "@guest.invalid",
                }),
                db.insert(installation).values({ digest: key, userId: newId }),
              ]);
              id = newId;
            } catch (error) {
              id = await owner();
              if (!id) throw error;
            }
          }
          const player = await db.select().from(user).where(eq(user.id, id)).get();
          if (!player) throw new APIError("UNAUTHORIZED");
          const session = await ctx.context.internalAdapter.createSession(id);
          await setSessionCookie(ctx, { session, user: player });
          return ctx.json({ success: true });
        },
      ),
      accountStatus: createAuthEndpoint(
        "/installation/status",
        {
          method: "GET",
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const player = await db
            .select({ subject: user.appleSubject })
            .from(user)
            .where(eq(user.id, ctx.context.session.user.id))
            .get();
          return ctx.json({ linked: !!player?.subject });
        },
      ),
      appleChallenge: createAuthEndpoint(
        "/installation/challenge",
        {
          method: "POST",
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const nonce = crypto.randomUUID();
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: "apple-" + nonce,
            value: ctx.context.session.session.id,
            expiresAt: new Date(Date.now() + 600000),
          });
          return ctx.json({ nonce });
        },
      ),
      appleAccount: createAuthEndpoint(
        "/installation/apple",
        {
          method: "POST",
          use: [sensitiveSessionMiddleware],
          body: z.object({
            secret,
            token: z.string().max(16384),
            nonce: z.uuid(),
            mode: z.enum(["link", "restore"]),
          }),
        },
        async (ctx) => {
          const current = ctx.context.session.user.id;
          const { token, nonce, mode } = ctx.body;
          const key = await digest(ctx.body.secret);
          const owns = and(eq(installation.digest, key), eq(installation.userId, current));
          if (!(await db.select().from(installation).where(owns).get()))
            throw new APIError("FORBIDDEN");
          const challenge = await db
            .delete(verification)
            .where(
              and(
                eq(verification.identifier, "apple-" + nonce),
                eq(verification.value, ctx.context.session.session.id),
                gt(verification.expiresAt, new Date()),
              ),
            )
            .returning({ id: verification.id });
          if (!challenge.length) throw new APIError("UNAUTHORIZED");
          let subject: string;
          try {
            subject = await verify(token, nonce);
          } catch {
            throw new APIError("UNAUTHORIZED");
          }
          const lookup = () => db.select().from(user).where(eq(user.appleSubject, subject)).get();
          const linked = await lookup();
          if (mode === "link") {
            if (linked && linked.id !== current) throw new APIError("CONFLICT");
            try {
              const changed = await db
                .update(user)
                .set({ appleSubject: subject })
                .where(
                  and(
                    eq(user.id, current),
                    or(isNull(user.appleSubject), eq(user.appleSubject, subject)),
                  ),
                )
                .returning({ id: user.id });
              if (!changed.length) throw new APIError("CONFLICT");
            } catch (error) {
              if (await lookup()) throw new APIError("CONFLICT");
              throw error;
            }
          } else {
            if (!linked) throw new APIError("NOT_FOUND");
            const switched = await db
              .update(installation)
              .set({ userId: linked.id })
              .where(owns)
              .returning();
            if (!switched.length) throw new APIError("CONFLICT");
            const session = await ctx.context.internalAdapter.createSession(linked.id);
            await ctx.context.internalAdapter.deleteSession(ctx.context.session.session.token);
            await setSessionCookie(ctx, { session, user: linked });
          }
          return ctx.json({ success: true });
        },
      ),
      requestAccountDeletion: createAuthEndpoint(
        "/installation/request-deletion",
        {
          method: "POST",
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const userId = ctx.context.session.user.id;
          await db
            .insert(inquiry)
            .values({
              id: "delete-" + userId,
              userId,
              body: "アカウントと関連データの削除を依頼します。",
            })
            .onConflictDoNothing();
          return ctx.json({ success: true });
        },
      ),
    },
  };
}
