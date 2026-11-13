import { beforeAll, expect, test } from "bun:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyApple } from "./installation";

let sign: (claims?: Record<string, unknown>) => Promise<string>;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  keys = createLocalJWKSet({ keys: [await exportJWK(pair.publicKey)] });
  sign = (claims = {}) =>
    new SignJWT({
      iss: "https://appleid.apple.com",
      aud: "com.matsupiee.wikicollection",
      sub: "player",
      nonce: "challenge",
      exp: Math.floor(Date.now() / 1000) + 60,
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .sign(pair.privateKey);
});
test("Apple署名の検証はアプリID・発行者・nonce・期限・署名鍵のすべてを要求する", async () => {
  expect(await verifyApple(await sign(), "challenge", keys)).toBe("player");
  for (const claims of [{ aud: "other" }, { iss: "other" }, { nonce: "other" }, { exp: 1 }]) {
    await expect(verifyApple(await sign(claims), "challenge", keys)).rejects.toThrow();
  }
  const other = await generateKeyPair("RS256");
  const otherKeys = createLocalJWKSet({ keys: [await exportJWK(other.publicKey)] });
  await expect(verifyApple(await sign(), "challenge", otherKeys)).rejects.toThrow();
});
