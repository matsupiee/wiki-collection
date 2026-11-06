import { expect, test } from "bun:test";
import { withApiCors } from "./api-cors";
const base = "http://localhost:3001";
const handle = async () =>
  new Response("ok", { headers: { "Set-Cookie": "session=example; HttpOnly" } });
test("Expo Web開発用originにだけ資格情報つきCORSを返し、Cookieを保持する", async () => {
  const response = await withApiCors(
    new Request(base, { headers: { origin: "http://localhost:8081" } }),
    base,
    handle,
  );
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
});
test("本番では開発originを許可せず、未許可preflightは拒否する", async () => {
  for (const [url, origin] of [
    ["https://wiki.example.com", "http://localhost:8081"],
    [base, "https://evil.example"],
  ]) {
    const response = await withApiCors(
      new Request(url!, { method: "OPTIONS", headers: { origin: origin! } }),
      url!,
      handle,
    );
    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  }
});
test("ネイティブのoriginなしリクエストと許可されたpreflight", async () => {
  expect(await (await withApiCors(new Request(base), base, handle)).text()).toBe("ok");
  expect(
    (
      await withApiCors(
        new Request(base, { method: "OPTIONS", headers: { origin: "http://localhost:8081" } }),
        base,
        handle,
      )
    ).status,
  ).toBe(204);
});
