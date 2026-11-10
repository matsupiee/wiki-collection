import { queryActionApi } from "./query-action-api";
import type { WikimediaClient } from "./wikimedia-client";

// TextExtracts は exintro を付けると1リクエストで最大20ページの冒頭を返す。
export async function fetchSummaries(client: WikimediaClient, lang: string, ids: number[]) {
  const summaries = new Map<number, { extract: string; revisionId: number }>();
  for (let i = 0; i < ids.length; i += 20) {
    const results = await queryActionApi(client, lang, {
      prop: "extracts|info",
      pageids: ids.slice(i, i + 20).join("|"),
      exintro: "1",
      explaintext: "1",
      exlimit: "20",
    });
    for (const page of results.flatMap((result) => result.pages ?? [])) {
      if (page.pageid && page.lastrevid && page.extract) {
        summaries.set(page.pageid, {
          extract: page.extract.trim().split(/\n+/)[0]!,
          revisionId: page.lastrevid,
        });
      }
    }
  }
  return summaries;
}
