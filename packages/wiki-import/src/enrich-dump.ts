import path from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { z } from "zod";
import { dumpArticleSchema, metadataSchema } from "./dump-article";
import { fetchImageLicenses, type CardImage } from "./fetch-image-licenses";
import { getExclusionReason } from "./get-exclusion-reason";
import { createWikimediaClient } from "./wikimedia-client";

const rowSchema = dumpArticleSchema.extend({
  metadata: metadataSchema,
  unresolvedImage: z.string().nullable(),
});
export async function enrichDump(
  articles: string,
  output: string,
  index: string,
  directory: string,
  offline: boolean,
  client = createWikimediaClient(),
) {
  const child = Bun.spawn(
    ["python3", path.join(import.meta.dirname, "dump-metadata.py"), articles, index, directory],
    { stdout: "pipe", stderr: "inherit" },
  );
  const writer = Bun.file(output).writer();
  const resolved = new Map<string, CardImage | null>();
  let rows: z.infer<typeof rowSchema>[] = [];
  async function flush() {
    const missing = new Set<string>();
    for (const row of rows) {
      if (
        !offline &&
        row.unresolvedImage &&
        !resolved.has(row.unresolvedImage) &&
        row.metadata.instanceOf &&
        !row.metadata.instanceOf.label.startsWith("ウィキメディア") &&
        !getExclusionReason({ ...row.metadata, title: row.title, extract: row.summary })
      )
        missing.add(row.unresolvedImage);
    }
    const results = await fetchImageLicenses(client, { lang: "ja", files: [...missing] });
    for (const file of missing) resolved.set(file, results.get(file) ?? null);
    for (const { unresolvedImage, ...row } of rows) {
      if (unresolvedImage) row.metadata.image = resolved.get(unresolvedImage) ?? null;
      writer.write(JSON.stringify(row) + "\n");
    }
    rows = [];
  }
  try {
    for await (const line of createInterface({ input: Readable.from(child.stdout) })) {
      rows.push(rowSchema.parse(JSON.parse(line)));
      if (rows.length === 500) await flush();
    }
    if (await child.exited) throw new Error("メタデータダンプの読み込みに失敗しました");
    if (rows.length) await flush();
  } finally {
    child.kill();
    await child.exited;
    await writer.end();
  }
}
