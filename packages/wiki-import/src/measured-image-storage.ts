import sharp from "sharp";
import type { ImageStorage } from "./mirror-images";

export type ImageDimensions = { imageWidth: number; imageHeight: number };

// 変換前の画像ではなく、保存に成功したWebPの表示サイズを返す。動画WebPは1フレーム分を使う。
export function measuredImageStorage(
  read: (key: string) => Promise<Uint8Array | null>,
  put: ImageStorage["put"],
  sizes: Map<string, ImageDimensions>,
): ImageStorage {
  async function measure(key: string, bytes: Uint8Array) {
    if (Buffer.from(bytes.subarray(8, 12)).toString("ascii") !== "WEBP") return;
    const { width, height, pageHeight } = await sharp(bytes).metadata();
    sizes.set(key, { imageWidth: width, imageHeight: pageHeight ?? height });
  }
  return {
    async exists(key) {
      const bytes = await read(key);
      if (!bytes) return false;
      await measure(key, bytes);
      return true;
    },
    async put(key, bytes, type) {
      await put(key, bytes, type);
      await measure(key, bytes);
    },
  };
}
