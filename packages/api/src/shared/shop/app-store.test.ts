import { expect, test } from "bun:test";
import fixtures from "../../test/storekit-signatures.json";
import { verifyTransaction } from "./app-store";

// A synthetic ES256 certificate chain with Apple's transaction-signing extensions.
// The test root is passed directly to the verifier; deployed Workers trust only Apple.
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "ES256", x5c: fixtures.chain });
const roots = [Buffer.from(fixtures.chain[2]!, "base64")];

for (const environment of ["Production", "Sandbox"] as const) {
  test(`同じ検証器で署名済みの ${environment} 取引を受け付け、改変や信頼されない署名は拒否する`, async () => {
    const claims = {
      environment,
      bundleId: "com.matsupiee.wikicollection",
      transactionId: "123",
      signedDate: 1760000000000,
    };
    const receipt = (payload: typeof claims) =>
      [header, encode(payload), fixtures.signatures[environment]].join(".");
    expect(await verifyTransaction(receipt(claims), false, roots)).toMatchObject(claims);
    await expect(
      verifyTransaction(receipt({ ...claims, transactionId: "456" }), false, roots),
    ).rejects.toThrow();
    await expect(verifyTransaction(receipt(claims))).rejects.toThrow();
  });
}
