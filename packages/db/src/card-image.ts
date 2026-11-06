// 元 URL は帰属表示・再取得のために保持する。R2 のキーと表示 URL はそこから導く。
export function commonsImageUrl(source: string): string | null {
  if (source.length > 4096) return null;
  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith("/wikipedia/commons/")
    )
      return null;
    // Wikimedia が付ける計測パラメータは画像の識別に含めない。
    for (const key of url.searchParams.keys()) {
      if (!key.startsWith("utm_")) return null;
    }
    url.search = "";
    return url.href;
  } catch {
    return null;
  }
}

export async function cardImageKey(source: string): Promise<string> {
  const url = commonsImageUrl(source);
  if (!url) throw new Error("Wikimedia Commons の画像 URL ではありません");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return `wiki-images/${Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function cardImageDisplayUrl(source: string): string {
  const url = commonsImageUrl(source);
  return url ? `/api/card-images?source=${encodeURIComponent(url)}` : source;
}

export const cardImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
