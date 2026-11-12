// JSON文字列にはU+2028やU+2029も含まれる。JSONLとTSVの行はLFまたはCRLFで区切る。
export async function* readLines(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let pending = "";
  for await (const chunk of chunks) {
    const lines = (pending + decoder.decode(chunk, { stream: true })).split("\n");
    pending = lines.pop()!;
    for (const line of lines) yield line.endsWith("\r") ? line.slice(0, -1) : line;
  }
  pending += decoder.decode();
  if (pending) yield pending;
}
