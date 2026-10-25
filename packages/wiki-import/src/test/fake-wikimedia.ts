// テスト用に、Wikimedia の API と同じ形の応答を返す fetch を作る。要約の文章はテスト用に書いたもので、Wikipedia の本文ではない

export type FakeArticle = {
  pageId: number;
  title: string;
  categories?: string[];
  disambiguation?: boolean;
  imageFile?: string;
  extract: string;
  revision: number;
  // 月ごとの閲覧数。返す月の数だけ並べる
  monthlyViews: number[];
};

export type FakeImage = {
  file: string;
  repository: "shared" | "local";
  license: string;
  artist?: string;
};

export type FakeWiki = {
  // カテゴリ名（"Category:" なし） → 中の記事の pageId とサブカテゴリ名
  categories: Record<string, { pages: number[]; subcats?: string[] }>;
  articles: FakeArticle[];
  images?: FakeImage[];
};

// continue を確かめるため、1回の応答に入れる件数を少なくする
const PAGE_SIZE = 2;

export function createFakeWikimedia(wiki: FakeWiki) {
  const requests: { url: string; userAgent: string | null }[] = [];
  const json = (body: unknown) => Response.json(body);
  const notFound = () => new Response("not found", { status: 404 });

  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push({ url: url.toString(), userAgent: new Headers(init?.headers).get("User-Agent") });

    if (url.pathname === "/w/api.php") {
      const p = url.searchParams;
      const offset = Number(p.get("cmcontinue") ?? p.get("clcontinue") ?? 0);
      if (p.get("list") === "categorymembers") {
        const category = wiki.categories[p.get("cmtitle")!.replace(/^Category:/, "")];
        const members = [
          ...(category?.subcats ?? []).map((name) => ({
            pageid: 0,
            ns: 14,
            title: `Category:${name}`,
            type: "subcat",
          })),
          ...(category?.pages ?? []).map((id) => ({
            pageid: id,
            ns: 0,
            title: wiki.articles.find((a) => a.pageId === id)!.title,
            type: "page",
          })),
        ];
        const next = offset + PAGE_SIZE;
        return json({
          query: { categorymembers: members.slice(offset, next) },
          ...(next < members.length && { continue: { cmcontinue: String(next), continue: "-||" } }),
        });
      }
      if (p.get("prop") === "categories|pageimages|pageprops") {
        // カテゴリは PAGE_SIZE 件ずつ返し、continue のたびに同じページへ足していく
        const ids = p.get("pageids")!.split("|").map(Number);
        const articles = ids.map((id) => wiki.articles.find((a) => a.pageId === id));
        const next = offset + PAGE_SIZE;
        const hasMore = articles.some((a) => (a?.categories?.length ?? 0) > next);
        return json({
          query: {
            pages: ids.map((id, i) => {
              const a = articles[i];
              if (!a) return { pageid: id, ns: 0, title: `不明 ${id}`, missing: true };
              return {
                pageid: a.pageId,
                ns: 0,
                title: a.title,
                categories: (a.categories ?? [])
                  .slice(offset, next)
                  .map((c) => ({ ns: 14, title: `Category:${c}` })),
                ...(offset === 0 && a.imageFile && { pageimage: a.imageFile.replaceAll(" ", "_") }),
                ...(offset === 0 && a.disambiguation && { pageprops: { disambiguation: "" } }),
              };
            }),
          },
          ...(hasMore && { continue: { clcontinue: String(next), continue: "||" } }),
        });
      }
      if (p.get("prop") === "imageinfo") {
        const titles = p.get("titles")!.split("|");
        const normalized = titles.map((t) => ({
          from: t,
          to: t.replace(/^File:/, "ファイル:").replaceAll("_", " "),
        }));
        return json({
          query: {
            normalized,
            pages: normalized.map(({ to }) => {
              const image = wiki.images?.find((i) => `ファイル:${i.file}` === to);
              if (!image) return { ns: 6, title: to, missing: true };
              return {
                ns: 6,
                title: to,
                imagerepository: image.repository,
                imageinfo: [
                  {
                    url: `https://upload.wikimedia.org/${image.file}`,
                    thumburl: `https://upload.wikimedia.org/thumb/640px-${image.file}`,
                    extmetadata: {
                      LicenseShortName: { value: image.license },
                      ...(image.artist && { Artist: { value: `<a href="#">${image.artist}</a>` } }),
                    },
                  },
                ],
              };
            }),
          },
        });
      }
    }

    const summary = url.pathname.match(/^\/api\/rest_v1\/page\/summary\/(.+)$/);
    if (summary) {
      const title = decodeURIComponent(summary[1]!).replaceAll("_", " ");
      const a = wiki.articles.find((x) => x.title === title);
      if (!a) return notFound();
      return json({
        type: a.disambiguation ? "disambiguation" : "standard",
        title: a.title,
        pageid: a.pageId,
        revision: String(a.revision),
        extract: a.extract,
      });
    }

    const pageviews = url.pathname.match(
      /\/per-article\/[^/]+\/all-access\/user\/([^/]+)\/monthly\//,
    );
    if (pageviews) {
      const title = decodeURIComponent(pageviews[1]!).replaceAll("_", " ");
      const a = wiki.articles.find((x) => x.title === title);
      if (!a || a.monthlyViews.length === 0) return notFound();
      return json({ items: a.monthlyViews.map((views) => ({ views })) });
    }

    throw new Error(`テストで用意していない URL です: ${url}`);
  };

  return { fetch: fetch as typeof globalThis.fetch, requests };
}
