import { TRPCError } from "@trpc/server";

const bundleId = "com.matsupiee.wikicollection";
// DER from https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
const root = Buffer.from(
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==",
  "base64",
);

export async function accountToken(userId: string) {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bundleId + ":" + userId)),
  );
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export async function verifyTransaction(
  receipt: string,
  localDevelopment = false,
  trustedRoots = [root],
) {
  try {
    // The Apple library initializes crypto at import time. Load it in the Worker request.
    const { Environment, SignedDataVerifier } = await import("@apple/app-store-server-library");
    // The unverified claim only selects the verifier. Apple verifies the signature,
    // bundle ID and signed environment before any transaction data is used.
    const payload = receipt.split(".")[1];
    const environment: unknown =
      payload && JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).environment;
    if (
      environment !== Environment.PRODUCTION &&
      environment !== Environment.SANDBOX &&
      !(localDevelopment && environment === Environment.XCODE)
    ) {
      throw new Error("Unexpected StoreKit environment");
    }
    const verifier = new SignedDataVerifier(trustedRoots, false, environment, bundleId, 6831869494);
    return await verifier.verifyAndDecodeTransaction(receipt);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "購入情報を確認できませんでした" });
  }
}
