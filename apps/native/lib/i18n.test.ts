import { expect, test } from "bun:test";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import { resolveLocale } from "./i18n";

test("地域を保ち、優先順で対応言語を選ぶ", () => {
  expect(resolveLocale(["fr-FR", "en-GB", "ja-JP"])).toBe("en-GB");
  expect(resolveLocale(["ja-JP", "en-US"])).toBe("ja-JP");
  expect(resolveLocale(["fr"])).toBe("ja");
  expect(resolveLocale([])).toBe("ja");
});

test("日英の全文言に同じ差し込み項目がある", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  const parameters = (text: string) => (text.match(/%\{\w+\}/g) ?? []).sort();
  for (const key of Object.keys(ja) as (keyof typeof ja)[]) {
    expect(parameters(en[key])).toEqual(parameters(ja[key]));
  }
});
