import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { cardImageDisplayUrl, cardImageKey } from "../card-image";

// 外部通信なしで画像配信を確認するためのローカル専用 PNG。D1 のデータは変更しない。
const source = "https://upload.wikimedia.org/wikipedia/commons/0/00/Wiki_collection_r2_test.png";
const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
const root = path.resolve(import.meta.dirname, "../../../..");
const proxy = await getPlatformProxy<{ CARD_IMAGES: R2Bucket }>({
  configPath: path.join(root, "apps/web/wrangler.local.jsonc"),
  persist: { path: path.join(root, ".wrangler/state/v3") },
});
try {
  await proxy.env.CARD_IMAGES.put(await cardImageKey(source), png, {
    httpMetadata: { contentType: "image/png" },
  });
  console.log(`画像確認: http://localhost:3001${cardImageDisplayUrl(source)}`);
} finally {
  await proxy.dispose();
}
