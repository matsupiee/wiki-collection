import { browserOrigins } from "@wiki-collection/auth/origins";

export async function withApiCors(
  request: Request,
  baseURL: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const allowed = origin !== null && browserOrigins(baseURL).includes(origin);
  if (request.method === "OPTIONS" && !allowed) return new Response(null, { status: 403 });
  const response =
    request.method === "OPTIONS" ? new Response(null, { status: 204 }) : await handler();
  if (!allowed) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, trpc-accept");
  headers.append("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
