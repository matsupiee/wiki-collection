import sharp from "sharp";

const MAX_BYTES = 50_000;

export async function encodeCardWebp(bytes: Uint8Array) {
  const input = sharp(bytes, { animated: true, limitInputPixels: 64_000_000 });
  const { format, compression, pages, width, height, pageHeight } = await input.metadata();
  if (
    !["jpeg", "png", "webp", "gif"].includes(format) &&
    !(format === "heif" && compression === "av1")
  )
    throw new Error("変換対象外の画像形式です");
  if ((pages ?? 1) === 1) input.autoOrient();
  let edge = Math.min(1600, Math.max(width, pageHeight ?? height));
  while (edge >= 1) {
    const resized = input.clone().resize(edge, edge, { fit: "inside", withoutEnlargement: true });
    let size = 0;
    for (const quality of [90, 75, 60]) {
      const output = await resized.clone().webp({ quality }).toBuffer();
      size = output.length;
      if (size <= MAX_BYTES) return output;
    }
    // 面積に比例する概算で次の解像度を決め、実際の出力サイズで再判定する。
    edge = Math.floor(edge * Math.min(0.9, Math.sqrt(44_000 / size)));
  }
  throw new Error("WebPを50 KB以下に変換できません");
}
