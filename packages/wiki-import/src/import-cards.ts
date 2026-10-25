import {
  rarityByThresholds,
  type RarityThresholds,
  thresholdsFromPageviews,
} from "@wiki-collection/db/rarity";

import {
  type CardRecord,
  type ExcludedRecord,
  type GenreRecord,
  readCardStore,
  writeCards,
  writeExcluded,
  writeGenres,
  writeThresholds,
} from "./card-store";
import { fetchImageLicenses } from "./fetch-image-licenses";
import { fetchInstanceOf } from "./fetch-instance-of";
import { fetchPageDetails } from "./fetch-page-details";
import { fetchSummary } from "./fetch-summary";
import { genreColor } from "./genre-color";
import { getExclusionReason } from "./get-exclusion-reason";
import type { TopPage } from "./top-pages";
import type { WikimediaClient } from "./wikimedia-client";

// いまは日本語版だけを扱う
const LANG = "ja";
// この件数ごとにファイルへ書く。途中で止めても、書いた分は次の取り込みで取り直さない
const CHUNK_SIZE = 500;

export type ImportResult = {
  inserted: { title: string; genre: string; rarity: string; monthlyPageviews: number }[];
  excluded: { title: string; reason: string }[];
  // この取り込みでレアリティの下限を決めたときだけ入る
  createdThresholds: RarityThresholds | null;
};

// 閲覧数の上位の記事を多い順に調べ、除外の条件に当たらないものをカードとして dataDir の JSONL に書き足す。
// ジャンルは記事の Wikidata の分類にする。カードにも除外にもなっていない記事を、上から limit 件まで調べる。
// すでにカードになっている記事は取り直さない。レアリティを作った時点で固定するため
export async function importCards(input: {
  client: WikimediaClient;
  // カードの JSONL とレアリティの下限を置くディレクトリ（card-store.ts）
  dataDir: string;
  // wiki:top で作った上位の記事の一覧。閲覧数の多い順
  topPages: TopPage[];
  // この取り込みで調べる記事の数の上限（除外する記事も含む）
  limit: number;
  now?: Date;
  log?: (message: string) => void;
}): Promise<ImportResult> {
  const { client, dataDir } = input;
  const now = input.now ?? new Date();
  const log = input.log ?? (() => {});

  const store = await readCardStore(dataDir);
  const seen = new Set([...store.cards, ...store.excluded].map((c) => c.wikiPageId));
  const genres = new Map(store.genres.map((g) => [g.slug, g]));

  // 下限は、上位の一覧全体の閲覧数の順位から最初に一度だけ決める。あとから足すカードも同じ下限で判定する
  const createdThresholds = store.thresholds
    ? null
    : thresholdsFromPageviews(input.topPages.map((p) => p.monthlyPageviews));
  const thresholds = store.thresholds ?? createdThresholds!;
  if (createdThresholds) await writeThresholds(dataDir, createdThresholds);

  const targets = input.topPages.filter((p) => !seen.has(p.pageId)).slice(0, input.limit);
  const result: ImportResult = { inserted: [], excluded: [], createdThresholds };
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    const chunk = targets.slice(i, i + CHUNK_SIZE);
    const { cards, excluded, newGenres } = await importChunk(client, {
      pages: chunk,
      genres,
      thresholds,
      now,
    });
    store.cards.push(...cards);
    store.excluded.push(...excluded);
    for (const g of newGenres) genres.set(g.slug, g);
    await writeCards(dataDir, store.cards, cards);
    if (newGenres.length > 0) await writeGenres(dataDir, [...genres.values()]);
    if (excluded.length > 0) await writeExcluded(dataDir, store.excluded);

    result.inserted.push(
      ...cards.map((c) => ({
        title: c.title,
        genre: genres.get(c.genre)!.name,
        rarity: c.rarity,
        monthlyPageviews: c.monthlyPageviews,
      })),
    );
    result.excluded.push(...excluded.map((e) => ({ title: e.title, reason: e.reason })));
    log(
      `${i + chunk.length} / ${targets.length} 件を調べました（カード ${result.inserted.length} 枚）`,
    );
  }
  return result;
}

async function importChunk(
  client: WikimediaClient,
  input: {
    pages: TopPage[];
    genres: Map<string, GenreRecord>;
    thresholds: RarityThresholds;
    now: Date;
  },
) {
  const { now } = input;
  const cards: CardRecord[] = [];
  const excluded: ExcludedRecord[] = [];
  const newGenres = new Map<string, GenreRecord>();
  const exclude = (wikiPageId: number, title: string, reason: string) =>
    excluded.push({ wikiPageId, title, reason });

  const details = await fetchPageDetails(client, {
    lang: LANG,
    pageIds: input.pages.map((p) => p.pageId),
  });
  // 要約や分類を取る前に、名前空間、カテゴリ、タイトルで外せる記事を外して、リクエストを減らす
  const kept = input.pages.flatMap((p) => {
    const d = details.get(p.pageId);
    if (!d) {
      exclude(p.pageId, "", "ページがない");
      return [];
    }
    const reason = d.ns !== 0 ? "記事ではない" : getExclusionReason(d);
    if (reason) {
      exclude(p.pageId, d.title, reason);
      return [];
    }
    return [{ page: p, detail: d }];
  });

  const [classes, images] = await Promise.all([
    fetchInstanceOf(client, {
      lang: LANG,
      ids: kept.flatMap(({ detail }) => (detail.wikibaseItem ? [detail.wikibaseItem] : [])),
    }),
    fetchImageLicenses(client, {
      lang: LANG,
      files: [
        ...new Set(kept.flatMap(({ detail }) => (detail.imageFile ? [detail.imageFile] : []))),
      ],
    }),
  ]);

  const classified = kept.flatMap((k) => {
    const instanceOf = k.detail.wikibaseItem ? classes.get(k.detail.wikibaseItem) : undefined;
    if (!instanceOf) {
      exclude(k.page.pageId, k.detail.title, "Wikidata の分類がない");
      return [];
    }
    // メインページや一覧記事など、Wikipedia の運営のためのページ
    if (instanceOf.label.startsWith("ウィキメディア")) {
      exclude(k.page.pageId, k.detail.title, "記事ではない");
      return [];
    }
    return [{ ...k, instanceOf }];
  });

  const fetched = await Promise.all(
    classified.map(async (c) => ({
      ...c,
      summary: await fetchSummary(client, { lang: LANG, title: c.detail.title }),
    })),
  );
  for (const { page, detail, instanceOf, summary } of fetched) {
    if (!summary) {
      exclude(page.pageId, detail.title, "要約が取れない");
      continue;
    }
    const reason =
      summary.type === "disambiguation"
        ? "曖昧さ回避"
        : getExclusionReason({ ...detail, extract: summary.extract });
    if (reason) {
      exclude(page.pageId, detail.title, reason);
      continue;
    }
    // ジャンルの名前は、初めて出てきたときの日本語ラベルで固定する
    if (!input.genres.has(instanceOf.id) && !newGenres.has(instanceOf.id)) {
      newGenres.set(instanceOf.id, {
        slug: instanceOf.id,
        name: instanceOf.label,
        colorHex: genreColor(instanceOf.id),
      });
    }
    const image = detail.imageFile ? images.get(detail.imageFile) : undefined;
    cards.push({
      wikiPageId: page.pageId,
      title: detail.title,
      genre: instanceOf.id,
      wikiRevisionId: summary.revisionId,
      wikiFetchedAt: now,
      summary: summary.extract,
      imageUrl: image?.url ?? null,
      imageCredit: image?.credit ?? null,
      rarity: rarityByThresholds(page.monthlyPageviews, input.thresholds),
      monthlyPageviews: page.monthlyPageviews,
      pageviewsMeasuredAt: now,
      isActive: true,
    });
  }
  return { cards, excluded, newGenres: [...newGenres.values()] };
}
