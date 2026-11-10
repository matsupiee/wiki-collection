import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { encodeCardWebp } from "./card-webp";

describe("カード画像のWebP変換", () => {
  for (const format of ["jpeg", "png", "webp", "gif", "avif"] as const) {
    test(format + "の小さい画像は拡大せずWebPに変換する", async () => {
      const source = await sharp({
        create: { width: 32, height: 24, channels: 3, background: "green" },
      })
        .toFormat(format)
        .toBuffer();
      const result = await encodeCardWebp(source);
      expect(await sharp(result).metadata()).toMatchObject({
        format: "webp",
        width: 32,
        height: 24,
      });
      expect(result.length).toBeLessThan(30_000);
    });
  }
  test("細部の多い画像は品質と解像度を調整して30〜50 KBに収める", async () => {
    const pixels = Buffer.alloc(1024 * 1024 * 3);
    let seed = 23;
    for (let i = 0; i < pixels.length; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      pixels[i] = seed >>> 24;
    }
    const source = await sharp(pixels, { raw: { width: 1024, height: 1024, channels: 3 } })
      .png()
      .toBuffer();
    const result = await encodeCardWebp(source);
    expect(result.length).toBeGreaterThanOrEqual(30_000);
    expect(result.length).toBeLessThanOrEqual(50_000);
    expect((await sharp(result).metadata()).width).toBeLessThan(1024);
  });
  test("入力の実体がSVGや破損画像なら変換しない", async () => {
    await expect(
      encodeCardWebp(Buffer.from('<svg width="20" height="20"></svg>')),
    ).rejects.toThrow();
    await expect(encodeCardWebp(Buffer.from("broken"))).rejects.toThrow();
  });
});
