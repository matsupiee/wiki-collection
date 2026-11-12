import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { catalogBucket } from "./catalog";
import { dumpFile } from "./dump-article";

function backupSource(month: string | undefined, input: string) {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("--month にデータの対象月を YYYY-MM で指定してください");
  const source = Bun.file(input);
  if (!source.size) throw new Error(`記事ファイルが空か存在しません: ${input}`);
  const key = `wiki-source/ja/${month}/articles-ja.jsonl`;
  return { key, source };
}

export async function backupDump(month: string | undefined, input: string, bucket = catalogBucket) {
  const { key, source } = backupSource(month, input);
  await bucket().file(key).write(source, { type: "application/x-ndjson" });
  return key;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      "wrangler-config": { type: "string" },
      month: { type: "string" },
      input: { type: "string", default: dumpFile },
    },
  });
  if (values["wrangler-config"]) {
    const { key } = backupSource(values.month, values.input);
    const run = Bun.spawn(
      [
        "node",
        fileURLToPath(import.meta.resolve("./remote-bucket.ts")),
        values["wrangler-config"],
        key,
        values.input,
      ],
      { stdout: "inherit", stderr: "inherit" },
    );
    if ((await run.exited) !== 0) throw new Error("R2 バックアップに失敗しました");
    console.log(`保存完了: ${key}`);
  } else {
    console.log(`保存完了: ${await backupDump(values.month, values.input)}`);
  }
}
