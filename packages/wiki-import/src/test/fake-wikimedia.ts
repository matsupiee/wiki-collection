// テスト用に、Wikimedia の API（Wikidata の SPARQL を含む）と同じ形の応答を返す fetch を作る。要約の文章はテスト用に書いたもので、Wikipedia の本文ではない

export type FakeArticle = {
  pageId: number;
  // 名前空間。省略すると記事（0）
  ns?: number;
  title: string;
  categories?: string[];
  disambiguation?: boolean;
  imageFile?: string;
  extract: string;
  revision: number;
  // 記事に紐づく Wikidata の ID と、その分類（P31）。label を省くと日本語ラベルのない分類になる
  wikidata?: { id: string; instanceOf: { id: string; label?: string; preferred?: boolean }[] };
};

export type FakeImage = {
  file: string;
  repository: "shared" | "local";
  license: string;
  artist?: string;
};

export type FakeWiki = {
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
      const offset = Number(p.get("clcontinue") ?? 0);
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
              const pageprops = {
                ...(a.disambiguation && { disambiguation: "" }),
                ...(a.wikidata && { wikibase_item: a.wikidata.id }),
              };
              return {
                pageid: a.pageId,
                ns: a.ns ?? 0,
                title: a.title,
                categories: (a.categories ?? [])
                  .slice(offset, next)
                  .map((c) => ({ ns: 14, title: `Category:${c}` })),
                ...(offset === 0 && a.imageFile && { pageimage: a.imageFile.replaceAll(" ", "_") }),
                ...(offset === 0 && Object.keys(pageprops).length > 0 && { pageprops }),
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

    if (url.hostname === "query.wikidata.org") {
      const query = url.searchParams.get("query")!;
      const ids = [...query.matchAll(/wd:(Q\d+)/g)].map((m) => m[1]!);
      const entity = (id: string) => `http://www.wikidata.org/entity/${id}`;
      return json({
        results: {
          bindings: wiki.articles.flatMap((a) =>
            a.wikidata && ids.includes(a.wikidata.id)
              ? a.wikidata.instanceOf.map((c) => ({
                  item: { value: entity(a.wikidata!.id) },
                  class: { value: entity(c.id) },
                  // ラベルのない分類は、ラベルの代わりに ID が返る
                  classLabel: { value: c.label ?? c.id },
                  rank: {
                    value: `http://wikiba.se/ontology#${c.preferred ? "PreferredRank" : "NormalRank"}`,
                  },
                }))
              : [],
          ),
        },
      });
    }

    throw new Error(`テストで用意していない URL です: ${url}`);
  };

  return { fetch: fetch as typeof globalThis.fetch, requests };
}
