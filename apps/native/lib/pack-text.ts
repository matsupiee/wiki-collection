import { locale, t, type MessageKey } from "./i18n";

const translations = new Map<string, readonly [MessageKey, MessageKey]>([
  ["basic", ["packBasic", "basicDescription"]],
  ["double-rare-guaranteed", ["packSR", "srDescription"]],
  ["legend-guaranteed", ["packLegend", "legendDescription"]],
] as const);

export function packText(slug: string, field: "name" | "description", original: string) {
  const keys = translations.get(slug);
  return locale.startsWith("en") && keys ? t(keys[field === "name" ? 0 : 1]) : original;
}
