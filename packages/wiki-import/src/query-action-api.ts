import type { WikimediaClient } from "./wikimedia-client";

export type ActionQueryResult = {
  pages?: ActionPage[];
  categorymembers?: { pageid: number; ns: number; title: string; type: "page" | "subcat" }[];
  normalized?: { from: string; to: string }[];
};

export type ActionPage = {
  pageid?: number;
  ns: number;
  title: string;
  missing?: boolean;
  categories?: { ns: number; title: string }[];
  pageimage?: string;
  pageprops?: { disambiguation?: string };
  imagerepository?: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }[];
};

type Response = {
  query?: ActionQueryResult;
  continue?: Record<string, string>;
};

// MediaWiki Action API の action=query を、continue がなくなるまで続けて呼ぶ。
// DOCS: https://www.mediawiki.org/wiki/API:Continue
export async function queryActionApi(
  client: WikimediaClient,
  lang: string,
  params: Record<string, string>,
): Promise<ActionQueryResult[]> {
  const results: ActionQueryResult[] = [];
  let cont: Record<string, string> = {};
  for (;;) {
    const search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      // サーバーが混んでいるときは処理を待たせる。DOCS: https://www.mediawiki.org/wiki/Manual:Maxlag_parameter
      maxlag: "5",
      ...params,
      ...cont,
    });
    const res = await client.getJson<Response>(`https://${lang}.wikipedia.org/w/api.php?${search}`);
    if (res?.query) results.push(res.query);
    if (!res?.continue) return results;
    cont = res.continue;
  }
}
