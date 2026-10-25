import { queryActionApi } from "./query-action-api";
import type { WikimediaClient } from "./wikimedia-client";

export type CardImage = { url: string; credit: string };

const BATCH_SIZE = 50;
// カードに表示する画像の幅
const THUMB_WIDTH = 640;

// 画像のライセンスを確かめ、カードに使える画像の URL と表記を返す。使えない画像はマップに入れない。
// Wikimedia Commons にある画像（imagerepository が shared）で、フリーライセンスのものだけを使う。
// 日本語版に直接アップロードされた画像は、フリーでないものが混じるため使わない。
// DOCS: https://www.mediawiki.org/wiki/API:Imageinfo , https://www.mediawiki.org/wiki/Extension:CommonsMetadata
export async function fetchImageLicenses(
  client: WikimediaClient,
  input: { lang: string; files: string[] },
): Promise<Map<string, CardImage>> {
  const images = new Map<string, CardImage>();
  for (let i = 0; i < input.files.length; i += BATCH_SIZE) {
    const batch = input.files.slice(i, i + BATCH_SIZE);
    const results = await queryActionApi(client, input.lang, {
      prop: "imageinfo",
      titles: batch.map((f) => `File:${f}`).join("|"),
      iiprop: "url|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: "LicenseShortName|Artist",
    });
    // "File:A_b.jpg" は "ファイル:A b.jpg" のように名前が整えられて返るので、元のファイル名に戻す
    const original = new Map<string, string>();
    for (const file of batch) original.set(`File:${file}`, file);
    for (const n of results.flatMap((r) => r.normalized ?? [])) {
      const file = original.get(n.from);
      if (file) original.set(n.to, file);
    }
    for (const page of results.flatMap((r) => r.pages ?? [])) {
      const file = original.get(page.title);
      const info = page.imageinfo?.[0];
      if (!file || !info || page.imagerepository !== "shared") continue;
      const license = info.extmetadata?.LicenseShortName?.value.trim() ?? "";
      const artist = stripHtml(info.extmetadata?.Artist?.value ?? "");
      if (!isFreeLicense(license)) continue;
      // CC BY 系は作者の表示が条件なので、作者がわからない画像は使わない
      if (!artist && !isPublicDomain(license)) continue;
      images.set(file, {
        url: info.thumburl ?? info.url,
        credit: `${artist ? `${artist}・` : ""}${license}（Wikimedia Commons）`,
      });
    }
  }
  return images;
}

export function isFreeLicense(license: string) {
  return /^CC BY(-SA)? \d/i.test(license) || isPublicDomain(license);
}

function isPublicDomain(license: string) {
  return /^(CC0|Public domain|PD\b)/i.test(license);
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
