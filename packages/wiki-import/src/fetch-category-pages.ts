import { queryActionApi } from "./query-action-api";
import type { WikimediaClient } from "./wikimedia-client";

export type CategoryPage = { pageId: number; title: string };

// カテゴリに入っている記事を集める。サブカテゴリは depth 段までたどる（0 ならそのカテゴリだけ）。
// DOCS: https://www.mediawiki.org/wiki/API:Categorymembers
export async function fetchCategoryPages(
  client: WikimediaClient,
  input: { lang: string; category: string; depth: number; maxPages: number },
): Promise<CategoryPage[]> {
  const pages = new Map<number, CategoryPage>();
  const visited = new Set<string>();
  let current = [`Category:${input.category}`];
  for (let level = 0; level <= input.depth && current.length > 0; level++) {
    const next: string[] = [];
    for (const category of current) {
      if (visited.has(category)) continue;
      visited.add(category);
      const results = await queryActionApi(client, input.lang, {
        list: "categorymembers",
        cmtitle: category,
        cmtype: "page|subcat",
        cmnamespace: "0|14",
        cmprop: "ids|title|type",
        cmlimit: "max",
      });
      for (const member of results.flatMap((r) => r.categorymembers ?? [])) {
        if (member.type === "subcat") next.push(member.title);
        else pages.set(member.pageid, { pageId: member.pageid, title: member.title });
        if (pages.size >= input.maxPages) return [...pages.values()];
      }
    }
    current = next;
  }
  return [...pages.values()];
}
