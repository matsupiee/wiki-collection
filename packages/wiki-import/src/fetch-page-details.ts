import { queryActionApi } from "./query-action-api";
import type { WikimediaClient } from "./wikimedia-client";

export type PageDetail = {
  pageId: number;
  title: string;
  // "Category:" を外したカテゴリ名
  categories: string[];
  isDisambiguation: boolean;
  // 記事の代表画像のファイル名（"File:" なし）
  imageFile: string | null;
};

// Action API は1回に 50 件までページを指定できる
const BATCH_SIZE = 50;

// 記事のカテゴリ、曖昧さ回避かどうか、代表画像のファイル名をまとめて取る。
// DOCS: https://www.mediawiki.org/wiki/API:Categories , https://www.mediawiki.org/wiki/Extension:PageImages
export async function fetchPageDetails(
  client: WikimediaClient,
  input: { lang: string; pageIds: number[] },
): Promise<Map<number, PageDetail>> {
  const details = new Map<number, PageDetail>();
  for (let i = 0; i < input.pageIds.length; i += BATCH_SIZE) {
    const results = await queryActionApi(client, input.lang, {
      prop: "categories|pageimages|pageprops",
      pageids: input.pageIds.slice(i, i + BATCH_SIZE).join("|"),
      cllimit: "max",
      piprop: "name",
      ppprop: "disambiguation",
    });
    // continue のたびに同じページが返り、カテゴリが少しずつ足されるので、ページごとにまとめる
    for (const page of results.flatMap((r) => r.pages ?? [])) {
      if (page.missing || page.pageid === undefined) continue;
      const existing = details.get(page.pageid);
      const categories = (page.categories ?? []).map((c) => c.title.replace(/^[^:]+:/, ""));
      if (existing) {
        existing.categories.push(...categories);
        existing.imageFile ??= page.pageimage ?? null;
        existing.isDisambiguation ||= page.pageprops?.disambiguation !== undefined;
        continue;
      }
      details.set(page.pageid, {
        pageId: page.pageid,
        title: page.title,
        categories,
        isDisambiguation: page.pageprops?.disambiguation !== undefined,
        imageFile: page.pageimage ?? null,
      });
    }
  }
  return details;
}
