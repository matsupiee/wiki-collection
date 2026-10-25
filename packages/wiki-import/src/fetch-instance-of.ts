import type { WikimediaClient } from "./wikimedia-client";

export type InstanceOf = { id: string; label: string };

// 1回のクエリに入れる Wikidata の ID の数。URL が長くなりすぎないようにする
const BATCH_SIZE = 200;
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

type Response = {
  results: {
    bindings: {
      item: { value: string };
      class: { value: string };
      classLabel?: { value: string };
      rank: { value: string };
    }[];
  };
};

const PREFERRED_RANK = "http://wikiba.se/ontology#PreferredRank";
const qid = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);
const qNumber = (id: string) => Number(id.slice(1));

// Wikidata の「分類」（instance of、P31）と、その日本語ラベルを取る。これをカードのジャンルにする。
// 分類が複数あるときは、推奨ランクのものを先に、同じランクなら ID の数字が小さいものを選ぶ。選び方を決めておき、取り直しても同じジャンルになるようにするため。
// 非推奨ランクの分類と、日本語ラベルのない分類は使わない。使える分類がない項目はマップに入れない。
// wbgetentities は項目のすべての文を返して重いので、P31 だけを SPARQL で取る。
// DOCS: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Wikidata_Query_Help , https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual
export async function fetchInstanceOf(
  client: WikimediaClient,
  input: { lang: string; ids: string[] },
): Promise<Map<string, InstanceOf>> {
  const result = new Map<string, InstanceOf>();
  const ids = [...new Set(input.ids)].filter((id) => /^Q\d+$/.test(id));
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const query = `SELECT ?item ?class ?classLabel ?rank WHERE {
  VALUES ?item { ${ids
    .slice(i, i + BATCH_SIZE)
    .map((id) => `wd:${id}`)
    .join(" ")} }
  ?item p:P31 ?statement .
  ?statement ps:P31 ?class ; wikibase:rank ?rank .
  FILTER(?rank != wikibase:DeprecatedRank)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${input.lang}" . }
}`;
    const res = await client.getJson<Response>(
      `${SPARQL_ENDPOINT}?${new URLSearchParams({ query, format: "json" })}`,
    );
    const best = new Map<string, { id: string; label: string; preferred: boolean }>();
    for (const b of res?.results.bindings ?? []) {
      const item = qid(b.item.value);
      const id = qid(b.class.value);
      const label = b.classLabel?.value ?? "";
      // ラベルのない分類は、ラベルの代わりに ID が返る
      if (!/^Q\d+$/.test(id) || label === "" || label === id) continue;
      const candidate = { id, label, preferred: b.rank.value === PREFERRED_RANK };
      const current = best.get(item);
      if (
        !current ||
        (candidate.preferred && !current.preferred) ||
        (candidate.preferred === current.preferred && qNumber(id) < qNumber(current.id))
      ) {
        best.set(item, candidate);
      }
    }
    for (const [item, { id, label }] of best) result.set(item, { id, label });
  }
  return result;
}
