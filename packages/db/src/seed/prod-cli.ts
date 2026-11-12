import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { dumpFile } from "../../../wiki-import/src/dump-article";
import { seedLocalDump } from "./prod-sql";

const { values } = parseArgs({
  options: {
    input: { type: "string", default: dumpFile },
    "wrangler-config": { type: "string" },
  },
});
const dir = await mkdtemp(path.join(tmpdir(), "wiki-d1-import-"));
try {
  let config = values["wrangler-config"];
  if (!config) {
    const id = process.env.D1_DATABASE_ID;
    if (!id) throw new Error("D1_DATABASE_ID または --wrangler-config を指定してください");
    config = path.join(dir, "wrangler.json");
    await writeFile(
      config,
      JSON.stringify({
        name: "wiki-seed",
        compatibility_date: "2026-09-01",
        account_id: process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID,
        d1_databases: [{ binding: "DB", database_name: "wiki-collection", database_id: id }],
      }),
    );
  }
  const file = path.join(dir, "cards.sql");
  const wrangler = path.resolve(import.meta.dirname, "../../node_modules/.bin/wrangler");
  const result = await seedLocalDump(values.input, async (sql) => {
    await writeFile(file, sql);
    const command = Bun.spawn(
      [wrangler, "d1", "execute", "DB", "--config", config, "--remote", "--file", file, "--yes"],
      { stdout: "inherit", stderr: "inherit" },
    );
    if ((await command.exited) !== 0)
      throw new Error("D1への投入に失敗しました。同じ入力で再実行できます");
  });
  console.log(`完了: ${result.articles} 記事、カード化対象 ${result.cards} 件`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
