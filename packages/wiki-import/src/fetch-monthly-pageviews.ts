import type { WikimediaClient } from "./wikimedia-client";

type Response = { items: { views: number }[] };

const MONTHS = 12;

// 直近12か月（今月を除く）の月平均閲覧数を取る。人による閲覧（agent=user）だけを数える。
// 閲覧のない月はデータが返らないので、合計を常に12で割る。できたばかりの記事が1か月の数字だけで高く出ないようにするため。
// DOCS: https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html
export async function fetchMonthlyPageviews(
  client: WikimediaClient,
  input: { lang: string; title: string; now: Date },
): Promise<number> {
  const { start, end } = pageviewsRange(input.now);
  const title = encodeURIComponent(input.title.replaceAll(" ", "_"));
  const res = await client.getJson<Response>(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${input.lang}.wikipedia/all-access/user/${title}/monthly/${start}/${end}`,
  );
  const total = (res?.items ?? []).reduce((sum, item) => sum + item.views, 0);
  return Math.round(total / MONTHS);
}

// 12か月前の月初から、先月末までを YYYYMMDD で返す（UTC）
export function pageviewsRange(now: Date) {
  const format = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: format(start), end: format(end) };
}
