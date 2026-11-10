import wtf from "wtf_wikipedia";

type TemplateParser = (body: string, fields: string[]) => Record<string, string>;
function reading(body: string, _templates: unknown[], parse: TemplateParser) {
  const { term, kana, foreign } = parse(body, ["term", "kana", "foreign"]);
  const detail = [kana, foreign].filter(Boolean).join("、");
  return (term ?? "") + (detail ? `（${detail}）` : "");
}
wtf.extend((_models: unknown, templates: Record<string, unknown>) => {
  templates.math = 0;
  for (const name of ["en", "fr", "de", "it", "es"]) templates[name] = 0;
  templates["読み仮名"] = reading;
  templates["読み仮名 ruby不使用"] = reading;
  templates["読み仮名 (ruby不使用)"] = reading;
});

export function leadSummary(lead: string) {
  // パーサーが日本語の句点をピリオドに変換するので、文字参照として通す。
  const markup = lead
    .replace(/\{\{\s*lang-([a-z-]+?)-short\s*\|/gi, "{{lang|$1|")
    .replaceAll("。", "&#x3002;");
  const paragraphs = wtf(markup, { lang: "ja" }).paragraphs();
  for (const paragraph of paragraphs) {
    const text = paragraph.text().trim();
    if (text) return text.replace(/ *&#x3002;/g, "。");
  }
  return "";
}
