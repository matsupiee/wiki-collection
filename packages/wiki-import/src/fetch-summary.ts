import type { WikimediaClient } from "./wikimedia-client";

export type PageSummary = {
  type: string;
  extract: string;
  revisionId: number;
};

type Response = { type: string; extract?: string; revision: string };

// 記事の冒頭の要約と、その時点の版 ID を取る。要約は extract をそのまま使う。
// DOCS: https://ja.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
export async function fetchSummary(
  client: WikimediaClient,
  input: { lang: string; title: string },
): Promise<PageSummary | null> {
  const title = encodeURIComponent(input.title.replaceAll(" ", "_"));
  const res = await client.getJson<Response>(
    `https://${input.lang}.wikipedia.org/api/rest_v1/page/summary/${title}`,
  );
  if (!res) return null;
  return { type: res.type, extract: res.extract?.trim() ?? "", revisionId: Number(res.revision) };
}
