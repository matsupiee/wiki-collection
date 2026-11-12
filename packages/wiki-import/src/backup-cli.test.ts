import { expect, test } from "bun:test";
import { backupDump } from "./backup-cli";

test("年月別のキーに元ファイルと同じバイト列を書き込む", async () => {
  const objects = new Map<string, Uint8Array>();
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      objects.set(new URL(request.url).pathname, new Uint8Array(await request.arrayBuffer()));
      return new Response();
    },
  });
  try {
    const bucket = () =>
      new Bun.S3Client({
        endpoint: server.url.href,
        bucket: "test",
        accessKeyId: "test",
        secretAccessKey: "test",
      });
    const input = import.meta.path;
    for (const month of ["2026-10", "2026-11"]) {
      const key = await backupDump(month, input, bucket);
      expect(key).toBe(`wiki-source/ja/${month}/articles-ja.jsonl`);
      expect(objects.get("/test/" + key)).toEqual(await Bun.file(input).bytes());
    }
    await expect(backupDump("2026-13", input, bucket)).rejects.toThrow("--month");
    expect(objects.size).toBe(2);
  } finally {
    server.stop(true);
  }
});

test("Wrangler経由で複数パートを1ファイルにまとめ、R2のETagとサイズを検証する", async () => {
  const { getPlatformProxy } = await import("wrangler");
  const { uploadBackupParts } = await import("./remote-bucket");
  const proxy = await getPlatformProxy<{ CARD_IMAGES: R2Bucket }>({
    configPath: new URL("../../../apps/web/wrangler.local.jsonc", import.meta.url).pathname,
    persist: false,
    remoteBindings: false,
  });
  try {
    const key = "wiki-source/ja/2026-10/articles-ja.jsonl";
    const bytes = new Uint8Array(8 * 1024 * 1024 + 3);
    bytes.set([1, 2, 3], bytes.length - 3);
    await uploadBackupParts(proxy.env.CARD_IMAGES, key, new Blob([bytes]));
    const stored = await proxy.env.CARD_IMAGES.get(key, { range: { suffix: 3 } });
    expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(Uint8Array.of(1, 2, 3));
  } finally {
    await proxy.dispose();
  }
});
