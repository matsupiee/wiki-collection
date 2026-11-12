import { expect, test } from "bun:test";
import { readLines } from "./read-lines";

test("本文中のUnicode改行を保持し、UTF-8の途中で分割されたチャンクとCRLFを読む", async () => {
  const record = JSON.stringify({ summary: "一\u2028二\u2029三" });
  const bytes = new TextEncoder().encode(record + "\r\n" + record);
  async function* chunks() {
    for (const byte of bytes) yield Uint8Array.of(byte);
  }
  expect(await Array.fromAsync(readLines(chunks()))).toEqual([record, record]);
});
