import { readCardStore, writeCards } from "./card-store";
import { queryActionApi } from "./query-action-api";
import type { WikimediaClient } from "./wikimedia-client";

// 過去に取り込んだ版のサイズを取得する。既存の測定値・要約・レアリティは変更しない。
export async function backfillLengths(client: WikimediaClient, dataDir: string) {
  const store = await readCardStore(dataDir);
  const targets = store.cards.filter((c) => c.articleLength == null);
  let updated = 0;
  for (let i = 0; i < targets.length; i += 50) {
    const chunk = targets.slice(i, i + 50);
    const results = await queryActionApi(client, "ja", {
      prop: "revisions",
      revids: chunk.map((c) => c.wikiRevisionId).join("|"),
      rvprop: "ids|size",
    });
    const sizes = new Map(
      results
        .flatMap((r) => r.pages ?? [])
        .flatMap((p) => p.revisions ?? [])
        .map((r) => [r.revid, r.size]),
    );
    const changed = chunk.filter((c) => sizes.has(c.wikiRevisionId));
    for (const c of changed) c.articleLength = sizes.get(c.wikiRevisionId)!;
    await writeCards(dataDir, store.cards, changed);
    updated += changed.length;
  }
  return { updated, missing: targets.length - updated };
}
