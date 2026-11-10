import { cardImageKey, cardImageTypes, commonsImageUrl } from "@wiki-collection/db/card-image";

// 公開済みの Commons 画像を配信する読み取り専用 API。未保存の場合は元画像へ転送する。
export async function serveCardImage(request: Request, bucket: R2Bucket): Promise<Response> {
  const source = commonsImageUrl(new URL(request.url).searchParams.get("source") ?? "");
  if (!source) return new Response("Invalid image source", { status: 400 });
  const key = await cardImageKey(source);
  const object = await bucket.get(key);
  if (!object) {
    // 保存前のカードも表示できるようにする。保存後に即反映できるよう転送はキャッシュしない。
    return new Response(null, {
      status: 302,
      headers: { Location: source, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  const contentType = object.httpMetadata?.contentType ?? "";
  if (!cardImageTypes.has(contentType)) {
    await object.body.cancel();
    return new Response("Unsupported image", { status: 415 });
  }
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
    ETag: object.httpEtag,
    "X-Content-Type-Options": "nosniff",
  });
  const etags =
    request.headers
      .get("if-none-match")
      ?.split(",")
      .map((s) => s.trim().replace(/^W\//, "")) ?? [];
  if (etags.includes("*") || etags.includes(object.httpEtag)) {
    await object.body.cancel();
    return new Response(null, { status: 304, headers });
  }
  headers.set("Content-Length", String(object.size));
  if (request.method === "HEAD") {
    await object.body.cancel();
    return new Response(null, { headers });
  }
  return new Response(object.body, { headers });
}
