import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { cardImageDisplayUrl, cardImageKey } from "../card-image";

// 外部通信なしで画像配信を確認するためのローカル専用 WebP。D1 のデータは変更しない。
const source = "https://upload.wikimedia.org/wikipedia/commons/0/00/Wiki_collection_r2_test.png";
const webp = Uint8Array.from(
  atob("UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoDAAMAAUAmJaACdLoB+AADsAD+82mX/mwIGaH0wf+mkeNI8aR8poAA"),
  (c) => c.charCodeAt(0),
);
const root = path.resolve(import.meta.dirname, "../../../..");
const proxy = await getPlatformProxy<{ CARD_IMAGES: R2Bucket }>({
  configPath: path.join(root, "apps/web/wrangler.local.jsonc"),
  persist: { path: path.join(root, ".wrangler/state/v3") },
});
try {
  await proxy.env.CARD_IMAGES.put(await cardImageKey(source), webp, {
    httpMetadata: { contentType: "image/webp" },
  });
  console.log(`画像確認: http://localhost:3001${cardImageDisplayUrl(source)}`);
} finally {
  await proxy.dispose();
}
